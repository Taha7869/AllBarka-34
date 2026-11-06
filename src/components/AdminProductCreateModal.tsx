import AdminItemForm from './AdminItemForm';
import type { Product } from '../types';
export default function AdminProductCreateModal({isOpen,onClose,onCreated,initialCategory}:{isOpen:boolean;onClose:()=>void;onCreated?:(p:Product)=>void;initialCategory?:string}) {
  return isOpen?<AdminItemForm onClose={onClose} onSaved={p=>{onCreated?.(p);onClose();}} initialCategory={initialCategory}/>:null;
}
