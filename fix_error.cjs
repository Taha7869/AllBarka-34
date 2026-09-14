const fs = require('fs');
let content = fs.readFileSync('src/components/ErrorBoundary.tsx', 'utf-8');
content = content.replace(/extends Component<Props, State>/, 'extends React.Component<Props, State>');
fs.writeFileSync('src/components/ErrorBoundary.tsx', content);
