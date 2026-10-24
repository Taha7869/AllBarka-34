/** Isolated transactional fixture. No external credentials or production network. */
export function memoryFirestore(initial: Record<string, unknown> = {}) {
  const records = new Map(Object.entries(initial).map(([key, value]) => [key, structuredClone(value)]));
  const snapshot = (path: string) => ({ id: path.split('/').at(-1)!, ref: reference(path), exists: records.has(path), data: () => structuredClone(records.get(path)) });
  const collection = (path: string): any => query(path, [], [], Infinity, null);
  const query=(path:string,filters:any[],sorts:any[],cap:number,after:any[]|null):any=>({
    path,doc:(id:string)=>reference(`${path}/${id}`),
    where:(field:string,operator:string,value:any)=>query(path,[...filters,[field,operator,value]],sorts,cap,after),
    orderBy:(field:any,direction='asc')=>query(path,filters,[...sorts,[typeof field==='string'?field:'__name__',direction]],cap,after),
    limit:(size:number)=>query(path,filters,sorts,size,after),
    startAfter:(...values:any[])=>query(path,filters,sorts,cap,values),
    get:async()=>{
      let docs=[...records.keys()].filter(key=>key.startsWith(`${path}/`)&&!key.slice(path.length+1).includes('/')).map(snapshot);
      for(const [field,operator,value] of filters)docs=docs.filter(doc=>{const actual=(doc.data() as any)?.[field];switch(operator){case '==':return actual===value;case '<=':return actual<=value;case '>=':return actual>=value;case 'in':return value.includes(actual);default:throw Error(`Unsupported fixture operator: ${operator}`);}});
      const key=(doc:any,field:string)=>field==='__name__'?doc.id:doc.data()[field];
      const compare=(a:any,b:any)=>a===b?0:a<b?-1:1;
      if(sorts.length)docs.sort((a,b)=>{for(const[field,direction]of sorts){const n=compare(key(a,field),key(b,field))*(direction==='desc'?-1:1);if(n)return n;}return 0;});
      if(after)docs=docs.filter(doc=>{for(let i=0;i<sorts.length;i++){const[field,direction]=sorts[i];const n=compare(key(doc,field),after[i])*(direction==='desc'?-1:1);if(n)return n>0;}return false;});
      return {docs:docs.slice(0,cap)};
    },
  });
  const reference = (path: string): any => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path),
    set: async (value: unknown, options?: { merge: boolean }) => records.set(path, structuredClone(options?.merge ? { ...(records.get(path) as object || {}), ...(value as object) } : value)),
    collection: (id: string) => collection(`${path}/${id}`) });
  let queue=Promise.resolve();
  const db: any = {
    collection, getAll: async (...refs: any[]) => refs.map(ref => snapshot(ref.path)),
    runTransaction: <T>(execute: (transaction: any) => Promise<T>):Promise<T> => {
      const run=async()=>{
        const pending:Array<()=>void>=[];
        const read=(ref:any)=>{if(pending.length)throw Error('Fixture transaction read after write');return snapshot(ref.path);};
        const transaction={get:async(ref:any)=>read(ref),getAll:async(...refs:any[])=>refs.map(read),
          set:(ref:any,value:unknown,options?:{merge:boolean})=>{pending.push(()=>records.set(ref.path,structuredClone(options?.merge?{...(records.get(ref.path) as object||{}),...(value as object)}:value)));}};
        const result=await execute(transaction);for(const write of pending)write();return result;
      };
      const result=queue.then(run);queue=result.then(()=>{},()=>{});return result;
    },
  };
  return { db, records };
}
