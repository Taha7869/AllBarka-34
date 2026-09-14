const fs = require('fs');
let content = fs.readFileSync('src/components/CheckoutModal.tsx', 'utf-8');

const blurFn = `
  const handleBlur = (field: string) => {
    let err = '';
    if (field === 'name') {
      if (!formData.name.trim() || formData.name.trim().length < 3) err = 'Full name must be at least 3 characters.';
    }
    if (field === 'phone') {
      const cleanPhone = formData.phone.replace(/[\\s-]/g, '');
      const pkPhoneRegex = /^((\\\+92)|(0092))-{0,1}\\d{3}-{0,1}\\d{7}$|^\\d{11}$|^\\d{4}-\\d{7}$/;
      if (!cleanPhone) err = 'Phone number is required.';
      else if (!pkPhoneRegex.test(cleanPhone)) err = 'Please enter a valid Pakistani number (e.g., 03001234567)';
    }
    if (field === 'address') {
      if (!formData.address.trim() || formData.address.trim().length < 8) err = 'Please provide a complete street address.';
    }
    if (err) {
      setErrors(prev => ({ ...prev, [field]: err }));
    }
  };
`;

const idx = content.indexOf('const handleInputChange =');
if (idx !== -1) {
  content = content.substring(0, idx) + blurFn + content.substring(idx);
  
  // Now add onBlur to the inputs
  content = content.replace(/onChange=\{\(e\) => handleInputChange\('name', e\.target\.value\)\}/g, "onChange={(e) => handleInputChange('name', e.target.value)}\n                        onBlur={() => handleBlur('name')}");
  content = content.replace(/onChange=\{\(e\) => handleInputChange\('phone', e\.target\.value\)\}/g, "onChange={(e) => handleInputChange('phone', e.target.value)}\n                        onBlur={() => handleBlur('phone')}");
  content = content.replace(/onChange=\{\(e\) => handleInputChange\('address', e\.target\.value\)\}/g, "onChange={(e) => handleInputChange('address', e.target.value)}\n                        onBlur={() => handleBlur('address')}");
  
  fs.writeFileSync('src/components/CheckoutModal.tsx', content);
  console.log("Patched onBlur in CheckoutModal");
}
