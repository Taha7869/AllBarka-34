import AdminItemForm from './AdminItemForm';
import type { Product } from '../types';
export default function AdminProductEditModal({isOpen,product,onClose,onSaved}:{isOpen:boolean;product:Product|null;onClose:()=>void;onSaved?:(p:Product)=>void}) {
  return isOpen&&product?<AdminItemForm key={product.id} product={product} onClose={onClose} onSaved={onSaved}/>:null;
}
