# Ensure vite binds to 0.0.0.0
sed -i 's/vite --host/vite --host 0.0.0.0/g' package.json
