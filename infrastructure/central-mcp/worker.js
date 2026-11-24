// Selling Certainty centralized MCP pilot. FAIL-CLOSED until identity and Airtable secrets are provisioned.
const TENANTS = Object.freeze({
  allstar: {
    writable: ["appurM1afA62rGexV", "appciaTjCX0E7fOmd"],
    readable: ["appurM1afA62rGexV", "appciaTjCX0E7fOmd", "appPTXlaoBTc7L7DK", "apphxr3PoumhGMYoz"]
  }
});
const MAX_BODY = 50000;
const now = () => Math.floor(Date.now()/1000);
const j = (body,status=200,headers={}) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const rpc = (id,result) => ({jsonrpc:"2.0",id,result});
const err = (id,code,message) => ({jsonrpc:"2.0",id,error:{code,message}});
function b64(s){return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),x=>x.charCodeAt(0));}
async function authenticate(request,env){
  if(!env.MCP_JWT_SECRET) return null;
  const auth=request.headers.get("authorization")||"";
  if(!auth.startsWith("Bearer "))return null;
  const parts=auth.slice(7).split(".");
  if(parts.length!==3)return null;
  try {
    const [h,p,s]=parts;
    const header=JSON.parse(new TextDecoder().decode(b64(h)));
    if(header.alg!=="HS256"||header.typ!=="JWT")return null;
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.MCP_JWT_SECRET),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
    if(!await crypto.subtle.verify("HMAC",key,b64(s),new TextEncoder().encode(h+"."+p)))return null;
    const claims=JSON.parse(new TextDecoder().decode(b64(p)));
    if(claims.iss!=="selling-certainty-mcp"||claims.aud!=="selling-certainty-mcp"||!claims.sub||
      !Number.isFinite(claims.exp)||claims.exp<=now()||claims.exp>now()+86400||
      !TENANTS[claims.tenant])return null;
    return {tenant:claims.tenant,subject:claims.sub};
  }catch{return null;}
}
const toolDefs=[
  ["list_records","List selected records from an authorized client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},max_records:{type:"integer",minimum:1,maximum:50}}],
  ["read_record","Read a record from an authorized client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},record_id:{type:"string"}}],
  ["create_record","Create one record in an authorized writable client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},fields:{type:"object"}}],
  ["update_record","Update one existing record in an authorized writable client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},record_id:{type:"string"},fields:{type:"object"}}]
].map(([name,description,properties])=>({name,description,inputSchema:{type:"object",properties,required:Object.keys(properties).filter(x=>x!=="max_records"),additionalProperties:false}}));
function validId(id,prefix){return typeof id==="string"&&new RegExp("^"+prefix+"[A-Za-z0-9]{14}$").test(id);}
async function doTool(name,args,identity,env){
  const rights=TENANTS[identity.tenant];
  const writable=["create_record","update_record"].includes(name);
  if(!rights||!rights.readable.includes(args.base_id)||(writable&&!rights.writable.includes(args.base_id)))
    throw new Error("Base not authorized for this client and operation");
  if(!validId(args.base_id,"app")||!validId(args.table_id,"tbl")||
     (["read_record","update_record"].includes(name)&&!validId(args.record_id,"rec")))
    throw new Error("Invalid Airtable identifier");
  if(["create_record","update_record"].includes(name)&&(!args.fields||typeof args.fields!=="object"||Array.isArray(args.fields)))
    throw new Error("Invalid record fields");
  const isFramework=!rights.writable.includes(args.base_id);
  const token=isFramework?env.FRAMEWORK_AIRTABLE_TOKEN:env.ALLSTAR_AIRTABLE_TOKEN;
  if(!token)throw new Error("Airtable credentials not provisioned");
  let uri="https://api.airtable.com/v0/"+args.base_id+"/"+args.table_id;
  let method="GET",body;
  if(name==="list_records"){
    const limit=Number.isInteger(args.max_records)?Math.min(Math.max(args.max_records,1),50):10;
    uri+="?maxRecords="+limit+"&pageSize="+limit;
  }else if(name==="read_record")uri+="/"+args.record_id;
  else if(name==="create_record"){method="POST";body=JSON.stringify({fields:args.fields,typecast:false});}
  else if(name==="update_record"){method="PATCH";uri+="/"+args.record_id;body=JSON.stringify({fields:args.fields,typecast:false});}
  else throw new Error("Unknown tool");
  const res=await fetch(uri,{method,headers:{"authorization":"Bearer "+token,"content-type":"application/json"},body});
  const responseText=await res.text();
  if(!res.ok)throw new Error("Airtable request failed ("+res.status+")");
  return JSON.parse(responseText);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==="/health"&&request.method==="GET")return j({service:"selling-certainty-mcp",status:"staging",ready:false});
    if(url.pathname!=="/mcp")return new Response("Not found",{status:404});
    // No public MCP tool enumeration; require valid tenant identity first.
    const identity=await authenticate(request,env);
    if(!identity)return j({error:"unauthorized"},401,{"www-authenticate":'Bearer realm="Selling Certainty MCP"'});
    if(request.method!=="POST")return j({error:"method not allowed"},405);
    const raw=await request.text();
    if(raw.length>MAX_BODY)return j({error:"request too large"},413);
    let req;try{req=JSON.parse(raw);}catch{return j(err(null,-32700,"Parse error"));}
    const id=req.id??null;
    if(req.method==="initialize")return j(rpc(id,{protocolVersion:"2025-06-18",capabilities:{tools:{listChanged:false}},serverInfo:{name:"selling-certainty-mcp",version:"0.1.0-staging"}}));
    if(req.method==="notifications/initialized")return new Response(null,{status:202});
    if(req.method==="ping")return j(rpc(id,{}));
    if(req.method==="tools/list")return j(rpc(id,{tools:toolDefs}));
    if(req.method==="tools/call"){
      if(!req.params||!toolDefs.some(x=>x.name===req.params.name))return j(err(id,-32602,"Unknown tool"));
      const args=req.params.arguments||{};
      try{return j(rpc(id,{content:[{type:"text",text:JSON.stringify(await doTool(req.params.name,args,identity,env))}]}));}
      catch(e){return j(rpc(id,{content:[{type:"text",text:e.message}],isError:true}));}
    }
    return j(err(id,-32601,"Method not found"));
  }
};