const { pathToFileURL } = require('node:url');

// CommonJS Jest needs a file URL for the browser worker's import.meta.url.
// Preserve its meaning rather than mocking or excluding the worker adapter.
module.exports = {
  name: 'owning-module-url',
  version: 1,
  factory(compiler) {
    const ts = compiler.configSet.compilerModule;
    return context => source => {
      const visit = node => {
        if (ts.isPropertyAccessExpression(node) &&
            node.expression.kind === ts.SyntaxKind.MetaProperty && node.name.text === 'url') {
          return ts.factory.createStringLiteral(pathToFileURL(source.fileName).href);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(source, visit);
    };
  },
};
