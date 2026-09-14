const fs = require('fs');

function addUseEffectImport(filename) {
  let content = fs.readFileSync(filename, 'utf-8');
  if (!content.includes('useEffect')) return; // nothing to do
  
  if (content.match(/import React, {[^}]*useEffect[^}]*} from 'react';/)) {
    // already has it
    return;
  }
  
  if (content.match(/import React, {([^}]*)} from 'react';/)) {
    content = content.replace(/import React, {([^}]*)} from 'react';/, "import React, { useEffect, $1 } from 'react';");
  } else if (content.match(/import React from 'react';/)) {
    content = content.replace(/import React from 'react';/, "import React, { useEffect } from 'react';");
  } else {
    // just add it at top
    content = "import { useEffect } from 'react';\n" + content;
  }
  
  fs.writeFileSync(filename, content);
  console.log("Added useEffect import to", filename);
}

addUseEffectImport('src/components/AuthModal.tsx');
addUseEffectImport('src/components/CartDrawer.tsx');
addUseEffectImport('src/components/CheckoutModal.tsx');
