import fs from 'fs';
import path from 'path';

function patchComponent(filePath) {
    if (!fs.existsSync(filePath)) return;
    let text = fs.readFileSync(filePath, 'utf8');

    if (text.includes('product.name') || text.includes('product.desc') || text.includes('product.contents') || text.includes('rel.name')) {
        if (!text.includes('getLocalized')) {
            text = text.replace(/import\s*\{\s*useLanguage\s*\}\s*from\s*['"]\.\.\/contexts\/LanguageContext['"];/, "import { useLanguage } from '../contexts/LanguageContext';\nimport { getLocalized } from '../utils/localize';");
            text = text.replace(/import\s*\{\s*useLanguage\s*\}\s*from\s*['"]\.\.\/\.\.\/contexts\/LanguageContext['"];/, "import { useLanguage } from '../../contexts/LanguageContext';\nimport { getLocalized } from '../../utils/localize';");
        }
    }

    if (text.includes('const { t } = useLanguage();')) {
        text = text.replace("const { t } = useLanguage();", "const { t, language } = useLanguage();");
    } else if (text.includes('useLanguage();') && !text.includes('language')) {
        // e.g. const { t, isRtl } = useLanguage();
        text = text.replace(/const\s*{\s*t([^}]*)}\s*=\s*useLanguage\(\);/, "const { t$1, language } = useLanguage();");
    }

    text = text.replace(/name:\s*product\.name,/g, "name_en: product.name_en,\n      name_ur: product.name_ur,\n      name_ar: product.name_ar,");
    
    text = text.replace(/product\.name/g, "getLocalized(product, 'name', language)");
    text = text.replace(/product\.desc/g, "getLocalized(product, 'desc', language)");
    text = text.replace(/product\.origin/g, "getLocalized(product, 'origin', language)");
    text = text.replace(/product\.health/g, "getLocalized(product, 'health', language)");
    text = text.replace(/product\.tasteProfile/g, "getLocalized(product, 'tasteProfile', language)");
    text = text.replace(/product\.contents/g, "getLocalized(product, 'contents', language)");
    text = text.replace(/product\.tag/g, "getLocalized(product, 'tag', language)");

    text = text.replace(/rel\.name/g, "getLocalized(rel, 'name', language)");
    text = text.replace(/rel\.desc/g, "getLocalized(rel, 'desc', language)");
    
    fs.writeFileSync(filePath, text, 'utf8');
}

['src/pages/ProductDetailPage.tsx', 'src/components/CategoryPLP.tsx', 'src/components/Breadcrumbs.tsx', 'src/pages/JournalPage.tsx', 'src/layouts/RootLayout.tsx', 'src/components/CartDrawer.tsx'].forEach(p => patchComponent(path.resolve(p)));

function patchBackend(filePath) {
    if (!fs.existsSync(filePath)) return;
    let text = fs.readFileSync(filePath, 'utf8');
    text = text.replace(/product\.name/g, "product.name_en");
    fs.writeFileSync(filePath, text, 'utf8');
}

['src/lib/orderValidation.ts', 'src/lib/serverOrderService.ts', 'src/services/n8nOrderNotification.ts'].forEach(p => patchBackend(path.resolve(p)));
console.log("Patched");
