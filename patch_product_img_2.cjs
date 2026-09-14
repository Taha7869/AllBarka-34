const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

const startStr = "<img";
const endStr = "/>";

const startIdx = content.indexOf(startStr, content.indexOf('<!-- Product Image Area'));
// Wait, it doesn't have an html comment, it's a jsx comment
const jsxCommentIdx = content.indexOf('{/* Product Image Area');
if (jsxCommentIdx !== -1) {
  const imgStart = content.indexOf('<img', jsxCommentIdx);
  const imgEnd = content.indexOf('/>', imgStart) + 2;
  
  const newImg = `<div className="w-full h-full relative flex items-center justify-center">
          <div className={\`absolute inset-0 bg-[#D4AF37]/10 animate-pulse transition-opacity duration-700 \${imgLoaded ? 'opacity-0' : 'opacity-100'}\`} />
          <img
            src={product.image || \`/images/\${product.imageName}\`}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=500&q=80';
              setImgLoaded(true);
            }}
            className={\`w-full h-full object-contain mix-blend-multiply drop-shadow-sm transition-all duration-700 group-hover:scale-105 \${imgLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-95 blur-md'}\`}
          />
        </div>`;
        
  content = content.substring(0, imgStart) + newImg + content.substring(imgEnd);
  fs.writeFileSync('src/components/ProductCard.tsx', content);
  console.log("Image patched.");
}
