import { EditorState, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxTree, TreeFragment } from '@codemirror/language';

export class ParseDebugger {
    static debugParseInfo(view: EditorView) {
        const tree = syntaxTree(view.state);
        
        console.group('Syntax Tree Parse Info');
        
        // Get parse information
        console.log('Tree Length:', tree.length);
        console.log('Tree Position:', tree.pos);
        
        // Get fragment information
        const fragments = (tree as any).fragments as TreeFragment[];
        if (fragments) {
            console.log('\nTree Fragments:');
            fragments.forEach((fragment, i) => {
                console.log(`Fragment ${i}:`, {
                    from: fragment.from,
                    to: fragment.to,
                    offset: fragment.offset,
                    length: fragment.length,
                    isReused: fragment.tree ? 'Yes' : 'No'
                });
            });
        }
        
        console.groupEnd();
    }

    static installParseLogger(view: EditorView) {
        // Track the last parse time
        let lastParse = Date.now();
        
        view.dispatch({
            effects: StateEffect.define<null>().of(null),
            annotations: Annotation.define<boolean>().of(true)
        });

        return EditorView.updateListener.of(update => {
            if (update.docChanged) {
                const newTree = syntaxTree(update.state);
                const parseTime = Date.now();
                
                console.group('Parse Update');
                console.log('Time since last parse:', parseTime - lastParse, 'ms');
                console.log('Changes:', update.changes.desc);
                
                // Log which parts of the tree were affected
                update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                    console.log('Change:', {
                        from: fromA,
                        to: toA,
                        insertedText: inserted.toString(),
                        newRange: `${fromB}-${toB}`
                    });
                    
                    // Show the syntax nodes around this change
                    const cursor = newTree.cursorAt(fromB);
                    console.log('Affected node:', {
                        type: cursor.type.name,
                        from: cursor.from,
                        to: cursor.to
                    });
                });
                
                ParseDebugger.debugParseInfo(view);
                console.groupEnd();
                
                lastParse = parseTime;
            }
        });
    }
}