const fs = require('fs');
let content = fs.readFileSync('src/components/Footer.tsx', 'utf-8');

// Replace Column 1
const col1Old = `                <li>
                  <Link
                    to="/shop"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Premium Nuts & Kernels
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Sun-Dried Fruits
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Superfood Seeds
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Gift Boxes & Combos
                  </Link>
                </li>`;

const col1New = `                <li>
                  <Link
                    to="/shop/nuts"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Premium Nuts & Kernels
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop/dried-fruits"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Sun-Dried Fruits
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop/seeds"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Superfood Seeds
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop/combos"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Gift Boxes & Combos
                  </Link>
                </li>`;

content = content.replace(col1Old, col1New);

// Fix column 2
const col2Old = `                <li>
                  <Link
                    to="/journal"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Harvest Chronicle
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pages/our-story"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Our Sourcing Heritage
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pages/blog-nutrition"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Nutritional Guidelines
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pages/sourcing-policy"
                    className="hover:text-[#D4AF37] transition-colors"
                  >
                    Sourcing Policy
                  </Link>
                </li>`;

const col2New = `                <li>
                  <Link
                    to="/journal"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Harvest Chronicle
                  </Link>
                </li>
                <li>
                  <Link
                    to="/story"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Our Sourcing Heritage
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pages/blog-nutrition"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Nutritional Guidelines
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pages/orchard-provenance"
                    className="hover:text-[#B8935F] transition-colors"
                  >
                    Orchard Provenance
                  </Link>
                </li>`;
content = content.replace(col2Old, col2New);

fs.writeFileSync('src/components/Footer.tsx', content);
