import { useEffect, useState } from 'react';
/** Retain trailing separators while typing; only synchronize genuinely external changes. */
export default function AdminDelimitedInput({value,onChange,multiline=false}:{value:string[];onChange:(value:string[])=>void;multiline?:boolean}) {
  const separator=multiline?'\n':',';
  const [raw,setRaw]=useState(()=>value.join(multiline?'\n':', '));
  useEffect(()=>{const parsed=raw.split(separator).map(s=>s.trim()).filter(Boolean);if(JSON.stringify(parsed)!==JSON.stringify(value))setRaw(value.join(multiline?'\n':', '));},[value,raw,multiline,separator]);
  const props={value:raw,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>{setRaw(e.target.value);onChange(e.target.value.split(separator).map(s=>s.trim()).filter(Boolean));}};
  return multiline?<textarea {...props}/>:<input {...props}/>;
}
