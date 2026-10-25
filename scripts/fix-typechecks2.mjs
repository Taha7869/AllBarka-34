import fs from 'fs';
import path from 'path';

function fixFile(p, replacer) {
    let fp = path.resolve(p);
    if (!fs.existsSync(fp)) return;
    let text = fs.readFileSync(fp, 'utf8');
    text = replacer(text);
    fs.writeFileSync(fp, text, 'utf8');
}

fixFile('server.ts', t => t.replace(/product\?\.name/g, 'product?.name_en')
                           .replace(/product\.name/g, 'product.name_en')
                           .replace(/name:\s*product\.name/g, 'name_en: product.name_en'));

fixFile('server_backup.ts', t => t.replace(/product\?\.name/g, 'product?.name_en')
                           .replace(/product\.name/g, 'product.name_en'));

fixFile('src/lib/order.ts', t => t.replace(/product\.name/g, 'product.name_en').replace(/item\.name/g, 'item.name_en'));

fixFile('src/contexts/CartContext.tsx', t => t.replace(/name: cartItem\.name/g, 'name_en: cartItem.name_en, name_ur: cartItem.name_ur, name_ar: cartItem.name_ar').replace(/name:\s*product\.name,/g, 'name_en: product.name_en, name_ur: product.name_ur, name_ar: product.name_ar,'));

['src/components/CartDrawer.tsx', 'src/pages/CartPage.tsx', 'src/pages/CheckoutPage.tsx'].forEach(p => {
    fixFile(p, t => {
        let txt = t.replace(/item\.name/g, "getLocalized(item, 'name', language)");
        txt = txt.replace(/product\.name/g, "getLocalized(product, 'name', language)");
        
        if (!txt.includes('getLocalized')) {
             txt = txt.replace(/import \{/i, "import { getLocalized } from '../utils/localize';\nimport {");
             // CheckoutPage is in pages, so it might need double dot
             txt = txt.replace(/import\s*\{\s*getLocalized\s*\}\s*from\s*'(\.\.\/)+utils\/localize';/, "import { getLocalized } from '../../utils/localize';"); 
        }
        if (txt.includes('useLanguage();') && !txt.includes('language')) {
             txt = txt.replace(/const\s*{\s*t([^}]*)}\s*=\s*useLanguage\(\);/, "const { t$1, language } = useLanguage();");
        }
        return txt;
    });
});

['src/components/CategoryPLP.tsx', 'src/components/ProductDetailAccordion.tsx', 'src/pages/JournalPage.tsx'].forEach(p => {
    fixFile(p, t => {
        let txt = t;
        const props = ['origin', 'harvest', 'sourcingDetails', 'storageTips', 'packagingDetails', 'recipe', 'allergenWarning'];
        props.forEach(pr => {
             const rr = new RegExp(`product\\.${pr}(?!_)`, 'g');
             txt = txt.replace(rr, `getLocalized(product, '${pr}', language)`);
        });
        txt = txt.replace(/product\.name/g, "getLocalized(product, 'name', language)");
        if (!txt.includes('getLocalized')) {
            if (p.includes('pages/')) {
                txt = txt.replace(/import \{/i, "import { getLocalized } from '../utils/localize';\nimport {");
            } else {
                txt = txt.replace(/import \{/i, "import { getLocalized } from '../utils/localize';\nimport {");
            }
        }
        if (txt.includes('useLanguage')) {
            if(!txt.includes('language')) {
                 txt = txt.replace(/const\s*{\s*t([^}]*)}\s*=\s*useLanguage\(\);/, "const { t$1, language } = useLanguage();");
            }
        }
        return txt;
    });
});

fixFile('src/data/products.ts', t => {
    let lines = t.split('\n');
    let out = [];
    for(let l of lines) {
       if(l.match(/^\s*name:\s*['"]/)) continue;
       if(l.match(/^\s*category:\s*['"]/)) continue;
       if(l.match(/^\s*health:\s*['"]/)) continue;
       if(l.match(/^\s*tag:\s*['"]/)) continue;
       if(l.match(/^\s*desc:\s*['"]/)) continue;
       if(l.match(/^\s*tasteProfile:\s*['"]/)) continue;
       if(l.match(/^\s*recipe:\s*['"]/)) continue;
       if(l.match(/^\s*origin:\s*['"]/)) continue;
       if(l.match(/^\s*harvest:\s*['"]/)) continue;
       if(l.match(/^\s*sourcingDetails:\s*['"]/)) continue;
       if(l.match(/^\s*storageTips:\s*['"]/)) continue;
       if(l.match(/^\s*packagingDetails:\s*['"]/)) continue;
       if(l.match(/^\s*allergenWarning:\s*['"]/)) continue;
       if(l.match(/^\s*contents:\s*['"]/)) continue;
       out.push(l);
    }
    return out.join('\n');
});

console.log("Patched fixed typechecks");
