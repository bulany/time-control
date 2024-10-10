import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNode, Tree, TreeCursor } from '@lezer/common';

export class SyntaxTreeDebugger {
    static printDetailedTree(view: EditorView) {
        const tree = syntaxTree(view.state);
        const doc = view.state.doc;
        
        // Print full tree with detailed formatting
        console.log(this.formatTree(tree, doc));
        
        // Print node-by-node details
        this.walkTree(tree, doc);
    }

    private static formatTree(tree: Tree, doc: Text, indentLevel: number = 0): string {
        const cursor = tree.cursor();
        let output = '';
        
        do {
            // Get the text content for this node
            const nodeText = doc.sliceString(cursor.from, cursor.to);
            
            // Create the indentation
            const indent = '  '.repeat(indentLevel);
            
            // Format node information
            output += `${indent}${cursor.name} {${cursor.from}-${cursor.to}}\n`;
            output += `${indent}├─ Type: ${cursor.type.name}\n`;
            output += `${indent}├─ Props: ${JSON.stringify(cursor.type.props)}\n`;
            output += `${indent}└─ Content: "${nodeText}"\n\n`;
            
            // If this node has children, recurse into them
            if (cursor.firstChild()) {
                output += this.formatTree(tree, doc, indentLevel + 1);
                cursor.parent();
            }
        } while (cursor.nextSibling());
        
        return output;
    }

    private static walkTree(tree: Tree, doc: Text) {
        console.group('Detailed Node Analysis');
        
        const cursor = tree.cursor();
        do {
            const nodeInfo = this.analyzeNode(cursor, doc);
            console.log(`Node at ${cursor.from}-${cursor.to}:`, nodeInfo);
            
            // Visualize node boundaries in the document
            const context = this.getNodeContext(cursor, doc);
            console.log('Context:', context);
            
            if (cursor.firstChild()) {
                console.group('Children');
                this.walkTree(tree, doc);
                console.groupEnd();
                cursor.parent();
            }
        } while (cursor.nextSibling());
        
        console.groupEnd();
    }

    private static analyzeNode(cursor: TreeCursor, doc: Text) {
        return {
            name: cursor.name,
            type: cursor.type.name,
            from: cursor.from,
            to: cursor.to,
            text: doc.sliceString(cursor.from, cursor.to),
            // Add any node properties
            props: cursor.type.props,
            // Check if it's a special node type
            isError: cursor.type.isError,
            isSkipped: cursor.type.isSkipped,
        };
    }

    private static getNodeContext(cursor: TreeCursor, doc: Text, contextChars: number = 20) {
        const start = Math.max(0, cursor.from - contextChars);
        const end = Math.min(doc.length, cursor.to + contextChars);
        
        let context = doc.sliceString(start, end);
        
        // Highlight the actual node content
        const nodeStart = cursor.from - start;
        const nodeEnd = cursor.to - start;
        
        return (
            context.slice(0, nodeStart) +
            '→[' + context.slice(nodeStart, nodeEnd) + ']←' +
            context.slice(nodeEnd)
        );
    }

    // Utility to print a visual tree representation
    static printTreeAscii(view: EditorView) {
        const tree = syntaxTree(view.state);
        console.log(this.createAsciiTree(tree, view.state.doc));
    }

    private static createAsciiTree(tree: Tree, doc: Text): string {
        const cursor = tree.cursor();
        return this.createAsciiTreeHelper(cursor, doc, '', true);
    }

    private static createAsciiTreeHelper(
        cursor: TreeCursor, 
        doc: Text, 
        prefix: string, 
        isLast: boolean
    ): string {
        let result = prefix;
        
        // Add the appropriate prefix character
        result += isLast ? '└── ' : '├── ';
        
        // Add the node information
        const nodeText = doc.sliceString(cursor.from, cursor.to);
        result += `${cursor.name} "${nodeText.slice(0, 20)}${nodeText.length > 20 ? '...' : ''}"\n`;
        
        // Handle children
        if (cursor.firstChild()) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            let siblings: string[] = [];
            
            do {
                siblings.push(this.createAsciiTreeHelper(
                    cursor, 
                    doc, 
                    newPrefix, 
                    !cursor.nextSibling()
                ));
                
                if (cursor.prevSibling()) cursor.nextSibling();
            } while (cursor.nextSibling());
            
            cursor.parent();
            result += siblings.join('');
        }
        
        return result;
    }
}