import { useId, useState, type KeyboardEvent } from 'react'
import { Plus, X } from 'lucide-react'

export function TagPicker({value,onChange,suggestions=[],label='Tags'}:{value:string[];onChange:(tags:string[])=>void;suggestions?:string[];label?:string}){
  const [draft,setDraft]=useState('')
  const listId=useId()
  const add=()=>{const tag=draft.trim();if(!tag)return;if(!value.some((item)=>item.toLowerCase()===tag.toLowerCase()))onChange([...value,tag]);setDraft('')}
  const keyDown=(event:KeyboardEvent<HTMLInputElement>)=>{if(event.key==='Enter'||event.key===','){event.preventDefault();add()}if(event.key==='Backspace'&&!draft&&value.length)onChange(value.slice(0,-1))}
  return <div className="tag-picker"><span>{label}</span><div className="tag-picker-control">{value.map((tag)=><button type="button" key={tag} onClick={()=>onChange(value.filter((item)=>item!==tag))} aria-label={`Remove ${tag} tag`}>{tag}<X size={11}/></button>)}<input aria-label={`Add ${label.toLowerCase()}`} list={listId} value={draft} onChange={(event)=>setDraft(event.target.value)} onKeyDown={keyDown} onBlur={add} placeholder={value.length?'Add another…':'Type a tag…'}/><button type="button" className="tag-add-button" aria-label={`Confirm new ${label.toLowerCase()}`} onMouseDown={(event)=>event.preventDefault()} onClick={add}><Plus size={14}/></button></div><datalist id={listId}>{suggestions.filter((item)=>!value.includes(item)).map((item)=><option key={item} value={item}/>)}</datalist><small>Press Enter or comma to add. Select a tag to remove it.</small></div>
}
