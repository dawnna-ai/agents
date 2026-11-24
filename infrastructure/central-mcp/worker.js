// Selling Certainty centralized MCP pilot. FAIL-CLOSED until identity and Airtable secrets are provisioned.
const TENANTS = Object.freeze({
  allstar: {
    writable: ["appurM1afA62rGexV", "appciaTjCX0E7fOmd"],
    readable: ["appurM1afA62rGexV", "appciaTjCX0E7fOmd", "appPTXlaoBTc7L7DK", "apphxr3PoumhGMYoz"]
  },
  elhamm: {
    writable: ["appBCXW4kuB0HMgiJ", "appGouXjb1SmK16u5"],
    readable: ["appBCXW4kuB0HMgiJ", "appGouXjb1SmK16u5", "appPTXlaoBTc7L7DK", "apphxr3PoumhGMYoz"]
  }
});
const MAX_BODY = 50000;
const now = () => Math.floor(Date.now()/1000);
const j = (body,status=200,headers={}) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...headers}});
const rpc = (id,result) => ({jsonrpc:"2.0",id,result});
const err = (id,code,message) => ({jsonrpc:"2.0",id,error:{code,message}});
function b64(s){return Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=")),x=>x.charCodeAt(0));}
async function authenticate(request,env,ctx){
  // Trust only identity verified by Cloudflare Access for this exact application.
  if (!ctx?.access || !['32b0d084a2cd69b6e1ac6534d2dd32ef6f115c30ff7bed99d72915e811b9c97b', 'a1640dfc43828c58e4222160be6284585964ac504a89a5a02639ae5e76825cd2'].includes(ctx.access.aud)) return null;
  let identity;
  try { identity = await ctx.access.getIdentity(); } catch { return null; }
  const email = String(identity?.email || '').trim().toLowerCase();
  if(email === 'mikemdf71@gmail.com') return {tenant:'allstar', subject:email};
  if(email === 'niko.hamm@elhamm.com') return {tenant:'elhamm', subject:email};
  return null;
}

const FRAMEWORKS = Object.freeze({
  appPTXlaoBTc7L7DK: "Agent Framework Master",
  apphxr3PoumhGMYoz: "6ix Framework Master"
});
const BASE_DIRECTORY = Object.freeze({
  allstar: {appurM1afA62rGexV: "AllStar Business Database", appciaTjCX0E7fOmd: "AllStar Agent Operations"},
  elhamm: {appBCXW4kuB0HMgiJ: "E.L. Hamm Business Database", appGouXjb1SmK16u5: "E.L. Hamm Agent Operations"}
});
const toolSpecs = [
 ["list_bases","Discover the current authenticated client's authorized Airtable bases with their purpose and read/write permissions. No arguments needed.",{},[]],
 ["list_tables","Discover the tables and names in an authorized Airtable base. Requires schema.bases:read scope on the corresponding Airtable token.",{base_id:{type:"string"}},["base_id"]],
 ["get_table_schema","Discover field names, IDs, types and descriptions in an authorized Airtable table. Requires schema.bases:read scope.",{base_id:{type:"string"},table_id:{type:"string"}},["base_id","table_id"]],
 ["get_base_relationships","Find Airtable linked-record relationships within an authorized base. Requires schema.bases:read.",{base_id:{type:"string"}},["base_id"]],
 ["get_database_guide","Explain authorized base purpose, observed table descriptions, and safe operational conventions. Distinguishes verified metadata from unconfigured business rules; requires schema.bases:read.",{base_id:{type:"string"}},["base_id"]],
 ["search_records","Search records by text in an authorized Airtable table. Scans at most 500 records; results can be partial in larger tables.",{base_id:{type:"string"},table_id:{type:"string"},query:{type:"string",minLength:1,maxLength:200},max_records:{type:"integer",minimum:1,maximum:50}},["base_id","table_id","query"]],
 ["list_records","List selected records from an authorized client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},max_records:{type:"integer",minimum:1,maximum:50}},["base_id","table_id"]],
 ["read_record","Read a record from an authorized client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},record_id:{type:"string"}},["base_id","table_id","record_id"]],
 ["create_record","Create one record in an authorized writable client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},fields:{type:"object"}},["base_id","table_id","fields"]],
 ["update_record","Update one existing record in an authorized writable client Airtable table",{base_id:{type:"string"},table_id:{type:"string"},record_id:{type:"string"},fields:{type:"object"}},["base_id","table_id","record_id","fields"]]
];
const toolDefs=toolSpecs.map(([name,description,properties,required])=>({name,description,inputSchema:{type:"object",properties,required,additionalProperties:false}}));
function validId(id,prefix){return typeof id==="string"&&new RegExp("^"+prefix+"[A-Za-z0-9]{14}$").test(id);}
function validTable(id){return validId(id,"tbl")||(typeof id==="string"&&id.length>0&&id.length<=100&&!id.includes("/")&&!id.includes("?")&&!id.includes("#")&&!id.includes("\\"));}
function authorized(args,identity,writable=false){
 const rights=TENANTS[identity.tenant];
 if(!rights||!validId(args.base_id,"app")||!rights.readable.includes(args.base_id)||(writable&&!rights.writable.includes(args.base_id)))throw new Error("Base not authorized for this client and operation");
 return rights;
}
function getToken(identity,base,rights,env){
 const t=!rights.writable.includes(base)?env.FRAMEWORK_AIRTABLE_TOKEN:identity.tenant==="allstar"?env.ALLSTAR_AIRTABLE_TOKEN:identity.tenant==="elhamm"?env.ELHAMM_AIRTABLE_TOKEN:null;
 if(!t)throw new Error("Airtable credentials not provisioned");
 return t;
}
async function airtable(url,token,method="GET",body){
 const res=await fetch(url,{method,headers:{authorization:"Bearer "+token,"content-type":"application/json"},body});
 const responseText=await res.text();
 if(!res.ok){let cause="unknown";try{cause=String(JSON.parse(responseText)?.error?.type||"unknown").slice(0,80)}catch{};throw new Error("Airtable request failed ("+res.status+", "+cause+")");}
 try{return JSON.parse(responseText)}catch{throw new Error("Invalid Airtable response")}
}
async function doTool(name,args,identity,env){
 if(name==="list_bases"){
   const rights=TENANTS[identity.tenant];if(!rights)throw new Error("Unknown tenant");
   return {tenant:identity.tenant,bases:rights.readable.map(id=>({id,name:FRAMEWORKS[id]||BASE_DIRECTORY[identity.tenant]?.[id]||"Authorized client base",purpose:FRAMEWORKS[id]?"shared_framework":"client_database",access:rights.writable.includes(id)?"read_write":"read_only"}))};
 }
 const writable=["create_record","update_record"].includes(name);
 const rights=authorized(args,identity,writable);
 const token=getToken(identity,args.base_id,rights,env);
 if(["list_tables","get_table_schema","get_base_relationships","get_database_guide"].includes(name)){
   const meta=await airtable("https://api.airtable.com/v0/meta/bases/"+args.base_id+"/tables",token);
   if(!Array.isArray(meta.tables))throw new Error("Invalid Airtable schema");
   if(name==="get_base_relationships"){
     const ids=new Set(meta.tables.map(t=>t.id));
     const relationships=[];
     for(const t of meta.tables)for(const f of (t.fields||[])){
       if(f.type!=="multipleRecordLinks")continue;
       const target=f.options?.linkedTableId;
       if(!target || !ids.has(target))continue;
       const linked=meta.tables.find(q=>q.id===target);
       relationships.push({source_table:{id:t.id,name:t.name},source_field:{id:f.id,name:f.name},target_table:{id:linked.id,name:linked.name},inverse_field_id:f.options?.inverseLinkFieldId||null,source:"airtable_linked_record_schema"});
     }
     return {base_id:args.base_id,relationships,scope:"Links within this base only; no inferred operational workflow",source:"airtable_schema"};
   }
   if(name==="get_database_guide"){
     const directoryName=FRAMEWORKS[args.base_id]||BASE_DIRECTORY[identity.tenant]?.[args.base_id]||"Authorized client database";
     const readOnly=!rights.writable.includes(args.base_id);
     const relationships=[];
     for(const t of meta.tables)for(const f of (t.fields||[]))if(f.type==="multipleRecordLinks"&&f.options?.linkedTableId){
       const target=meta.tables.find(q=>q.id===f.options.linkedTableId);
       if(target)relationships.push({from:t.name,field:f.name,to:target.name});
     }
     return {base_id:args.base_id,name:directoryName,access:readOnly?"read_only":"read_write",purpose:readOnly?"Shared reference framework; no modifications permitted":"Client-specific authorized business or agent-operations data",tables:meta.tables.map(t=>({id:t.id,name:t.name,description:t.description||null,primary_field_id:t.primaryFieldId,field_names:(t.fields||[]).map(f=>f.name)})),relationships,operational_rules:{status:"not_configured",authoritative_sources:"Not verified; consult approved Client Project Brief and Project Instructions",record_ownership:"Not verified; do not infer from names",completion_evidence:"An assignment or handoff is not proof of execution",write_safety:"Use only approved client-specific operating procedures; never invent status transitions or record mappings"},provenance:{schema:"live Airtable metadata",purpose:"server-configured base directory",operational_rules:"generic guardrails, not client-approved SOP"},warning:"Table names, field names, and links do not establish business workflow authority."};
   }
   if(name==="list_tables")return {base_id:args.base_id,tables:meta.tables.map(t=>({id:t.id,name:t.name,description:t.description||"",primaryFieldId:t.primaryFieldId}))};
   if(!validTable(args.table_id))throw new Error("Invalid table identifier");
   const table=meta.tables.find(t=>t.id===args.table_id||t.name===args.table_id);
   if(!table)throw new Error("Table not found in authorized base");
   return {base_id:args.base_id,table:{id:table.id,name:table.name,description:table.description||"",primaryFieldId:table.primaryFieldId,fields:(table.fields||[]).map(f=>({id:f.id,name:f.name,type:f.type,description:f.description||"",options:f.options||undefined}))}};
 }
 if(!validTable(args.table_id)||(["read_record","update_record"].includes(name)&&!validId(args.record_id,"rec")))throw new Error("Invalid Airtable identifier");
 if(writable&&(!args.fields||typeof args.fields!=="object"||Array.isArray(args.fields)))throw new Error("Invalid record fields");
 let uri="https://api.airtable.com/v0/"+args.base_id+"/"+encodeURIComponent(args.table_id);
 if(name==="list_records"){
   const limit=Number.isInteger(args.max_records)?Math.min(Math.max(args.max_records,1),50):10;
   return airtable(uri+"?maxRecords="+limit+"&pageSize="+limit,token);
 }
 if(name==="search_records"){
   if(typeof args.query!=="string"||!args.query.trim()||args.query.length>200)throw new Error("Invalid search query");
   const q=args.query.toLocaleLowerCase();const limit=Number.isInteger(args.max_records)?Math.min(Math.max(args.max_records,1),50):10;
   const matches=[];let offset,scanned=0;
   do{
     const query=new URLSearchParams({pageSize:"100"});if(offset)query.set("offset",offset);
     const page=await airtable(uri+"?"+query,token);
     if(!Array.isArray(page.records))throw new Error("Invalid Airtable records");
     for(const rec of page.records){scanned++;if(Object.values(rec.fields||{}).some(v=>JSON.stringify(v).toLocaleLowerCase().includes(q)))matches.push(rec);if(matches.length>=limit||scanned>=500)break;}
     offset=page.offset;
   }while(offset&&matches.length<limit&&scanned<500);
   return {records:matches.slice(0,limit),scanned_records:scanned,partial:!!offset||scanned>=500,search_scope:"first 500 records maximum; use specific table and narrower searches for large datasets"};
 }
 if(name==="read_record")return airtable(uri+"/"+args.record_id,token);
 if(name==="create_record")return airtable(uri,token,"POST",JSON.stringify({fields:args.fields,typecast:false}));
 if(name==="update_record")return airtable(uri+"/"+args.record_id,token,"PATCH",JSON.stringify({fields:args.fields,typecast:false}));
 throw new Error("Unknown tool");
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname==="/health"&&request.method==="GET")return j({service:"selling-certainty-mcp",status:"staging",ready:false});
    if(url.pathname!=="/mcp")return new Response("Not found",{status:404});
    // No public MCP tool enumeration; require valid tenant identity first.
    const identity=await authenticate(request,env,ctx);
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