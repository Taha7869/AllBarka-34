const fs = require('fs');

let content = fs.readFileSync('src/components/ProductCard.tsx', 'utf-8');

// Add const [imgLoaded, setImgLoaded] = useState(false);
content = content.replace(/const \{ addToast \} = useToast\(\);/, "const { addToast } = useToast();\n  const [imgLoaded, setImgLoaded] = useState(false);");

// Replace the img tag
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

content = content.replace(/<img[\s\S]*?className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm transition-transform duration-500 group-hover:scale-105"\n\s*\/>/, newImg);

fs.writeFileSync('src/components/ProductCard.tsx', content);
