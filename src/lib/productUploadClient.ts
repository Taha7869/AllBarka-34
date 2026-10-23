import { apiUrl } from './apiUrl';
import { AdminRequestError } from './adminClient';
import { validateProductMediaUrl } from './productMedia';
export async function uploadProductPhoto(getToken: () => Promise<string>, file: File, signal?: AbortSignal): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size < 1 || file.size > 5 * 1024 * 1024) throw new AdminRequestError('INVALID_UPLOAD_TYPE_OR_SIZE');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort',cancel,{once:true});
  if (signal?.aborted) cancel();
  let rejectAbort: (error: Error) => void = () => {};
  const aborted = new Promise<never>((_,reject)=>{rejectAbort=reject;});
  controller.signal.addEventListener('abort',()=>rejectAbort(new AdminRequestError('REQUEST_CANCELLED')),{once:true});
  const timer = setTimeout(cancel,30000);
  try {
    if (controller.signal.aborted) throw new AdminRequestError('REQUEST_CANCELLED');
    const token = await Promise.race([getToken(),aborted]);
    const response = await Promise.race([fetch(apiUrl('/api/admin/catalog/uploads'),{method:'POST',signal:controller.signal,credentials:'omit',cache:'no-store',headers:{Authorization:`Bearer ${token}`,'Content-Type':file.type},body:file}),aborted]);
    const data = await Promise.race([response.json(),aborted]);
    if (!response.ok) throw new AdminRequestError(data.code || 'UPLOAD_FAILED',response.status);
    return validateProductMediaUrl(data.url,'image');
  } finally { clearTimeout(timer);signal?.removeEventListener('abort',cancel); }
}
