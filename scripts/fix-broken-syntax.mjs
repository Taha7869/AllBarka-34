import fs from 'fs';
import path from 'path';

function fix(filePath) {
    if (!fs.existsSync(filePath)) return;
    let text = fs.readFileSync(filePath, 'utf8');
    
    text = text.replace(/getLocalized\(product,\s*'name',\s*language\)_en/g, "product.name_en");
    text = text.replace(/getLocalized\(product,\s*'name',\s*language\)_ur/g, "product.name_ur");
    text = text.replace(/getLocalized\(product,\s*'name',\s*language\)_ar/g, "product.name_ar");
    
    fs.writeFileSync(filePath, text, 'utf8');
}

['src/pages/ProductDetailPage.tsx', 'src/layouts/RootLayout.tsx', 'src/pages/JournalPage.tsx', 'src/components/CartDrawer.tsx', 'src/components/CategoryPLP.tsx'].forEach(p => fix(path.resolve(p)));
