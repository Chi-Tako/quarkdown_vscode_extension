// Quarkdown Standard Library Definitions
export interface FunctionSignature {
    name: string;
    description: string;
    parameters: Parameter[];
    category: string;
    examples: string[];
}

export interface Parameter {
    name: string;
    type: string;
    description: string;
    optional?: boolean;
    defaultValue?: string;
}

export const QUARKDOWN_FUNCTIONS: FunctionSignature[] = [
    // Mathematical Functions
    {
        name: 'sum',
        description: 'Adds multiple numbers together',
        category: 'Math',
        parameters: [
            { name: 'numbers', type: 'number[]', description: 'Numbers to sum' }
        ],
        examples: ['.sum {1} {2} {3}', '.sum {.a} {.b}']
    },
    {
        name: 'multiply',
        description: 'Multiplies numbers together',
        category: 'Math',
        parameters: [
            { name: 'numbers', type: 'number[]', description: 'Numbers to multiply' }
        ],
        examples: ['.multiply {4} {5}', '.multiply {.width} {.height}']
    },
    {
        name: 'divide',
        description: 'Divides first number by second',
        category: 'Math',
        parameters: [
            { name: 'dividend', type: 'number', description: 'Number to divide' },
            { name: 'divisor', type: 'number', description: 'Number to divide by' }
        ],
        examples: ['.divide {10} {2}', '.divide {.total} {.count}']
    },
    {
        name: 'pow',
        description: 'Raises first number to power of second',
        category: 'Math',
        parameters: [
            { name: 'base', type: 'number', description: 'Base number' },
            { name: 'exponent', type: 'number', description: 'Exponent' }
        ],
        examples: ['.pow {2} {3}', '.pow {.radius} {2}']
    },
    {
        name: 'sin',
        description: 'Calculates sine of angle in radians',
        category: 'Math',
        parameters: [
            { name: 'angle', type: 'number', description: 'Angle in radians' }
        ],
        examples: ['.sin {.pi}', '.sin {1.5708}']
    },
    {
        name: 'cos',
        description: 'Calculates cosine of angle in radians',
        category: 'Math',
        parameters: [
            { name: 'angle', type: 'number', description: 'Angle in radians' }
        ],
        examples: ['.cos {0}', '.cos {.pi}']
    },
    {
        name: 'tan',
        description: 'Calculates tangent of angle in radians',
        category: 'Math',
        parameters: [
            { name: 'angle', type: 'number', description: 'Angle in radians' }
        ],
        examples: ['.tan {.pi::divide {4}}', '.tan {0.785}']
    },
    {
        name: 'truncate',
        description: 'Truncates number to specified decimal places',
        category: 'Math',
        parameters: [
            { name: 'number', type: 'number', description: 'Number to truncate' },
            { name: 'places', type: 'number', description: 'Decimal places', optional: true, defaultValue: '0' }
        ],
        examples: ['.truncate {3.14159} {2}', '.truncate {.value}']
    },
    {
        name: 'round',
        description: 'Rounds number to nearest integer or decimal places',
        category: 'Math',
        parameters: [
            { name: 'number', type: 'number', description: 'Number to round' },
            { name: 'places', type: 'number', description: 'Decimal places', optional: true, defaultValue: '0' }
        ],
        examples: ['.round {3.14159} {2}', '.round {.average}']
    },
    {
        name: 'iseven',
        description: 'Checks if number is even',
        category: 'Math',
        parameters: [
            { name: 'number', type: 'number', description: 'Number to check' }
        ],
        examples: ['.iseven {4}', '.iseven {.counter}']
    },
    {
        name: 'isgreater',
        description: 'Checks if first number is greater than second',
        category: 'Math',
        parameters: [
            { name: 'first', type: 'number', description: 'First number' },
            { name: 'second', type: 'number', description: 'Second number' }
        ],
        examples: ['.isgreater {5} {3}', '.isgreater {.score} {.threshold}']
    },
    {
        name: 'pi',
        description: 'Mathematical constant π (pi)',
        category: 'Math',
        parameters: [],
        examples: ['.pi', '.multiply {2} {.pi} {.radius}']
    },

    // Layout Functions
    {
        name: 'row',
        description: 'Creates a horizontal row layout',
        category: 'Layout',
        parameters: [
            { name: 'content', type: 'content', description: 'Content to arrange in row' },
            { name: 'alignment', type: 'string', description: 'Row alignment', optional: true },
            { name: 'gap', type: 'string', description: 'Gap between items', optional: true }
        ],
        examples: ['.row alignment:{center} gap:{1cm}:', '.row {Content 1} {Content 2}']
    },
    {
        name: 'column',
        description: 'Creates a vertical column layout',
        category: 'Layout',
        parameters: [
            { name: 'content', type: 'content', description: 'Content to arrange in column' },
            { name: 'alignment', type: 'string', description: 'Column alignment', optional: true },
            { name: 'gap', type: 'string', description: 'Gap between items', optional: true }
        ],
        examples: ['.column alignment:{center}:', '.column {Item 1} {Item 2}']
    },
    {
        name: 'grid',
        description: 'Creates a grid layout',
        category: 'Layout',
        parameters: [
            { name: 'columns', type: 'number', description: 'Number of columns' },
            { name: 'content', type: 'content', description: 'Grid content' },
            { name: 'gap', type: 'string', description: 'Gap between grid items', optional: true }
        ],
        examples: ['.grid {3} gap:{10px}:', '.grid {2} {A} {B} {C} {D}']
    },
    {
        name: 'center',
        description: 'Centers content horizontally and vertically',
        category: 'Layout',
        parameters: [
            { name: 'content', type: 'content', description: 'Content to center' }
        ],
        examples: ['.center {Centered text}', '.center:']
    },
    {
        name: 'box',
        description: 'Creates a box container with optional styling',
        category: 'Layout',
        parameters: [
            { name: 'content', type: 'content', description: 'Box content' },
            { name: 'padding', type: 'string', description: 'Box padding', optional: true },
            { name: 'border', type: 'string', description: 'Border style', optional: true }
        ],
        examples: ['.box padding:{1cm} border:{solid}:', '.box {Content}']
    },
    {
        name: 'figure',
        description: 'Creates a figure with caption',
        category: 'Layout',
        parameters: [
            { name: 'content', type: 'content', description: 'Figure content' },
            { name: 'caption', type: 'string', description: 'Figure caption', optional: true },
            { name: 'placement', type: 'string', description: 'Figure placement', optional: true }
        ],
        examples: ['.figure caption:{My Figure}:', '.figure {![Image](path.jpg)} {Caption}']
    },

    // Table Functions
    {
        name: 'table',
        description: 'Creates or manipulates tables',
        category: 'Table',
        parameters: [
            { name: 'content', type: 'content', description: 'Table content or data' }
        ],
        examples: ['.table:', '.table {| A | B |\n|---|---|\n| 1 | 2 |}']
    },

    // Control Flow
    {
        name: 'if',
        description: 'Conditional content rendering',
        category: 'Control',
        parameters: [
            { name: 'condition', type: 'boolean', description: 'Condition to evaluate' },
            { name: 'content', type: 'content', description: 'Content to render if true' }
        ],
        examples: ['.if {.n::iseven} **.n** is even', '.if {.show} {Visible content}']
    },
    {
        name: 'ifnot',
        description: 'Inverse conditional content rendering',
        category: 'Control',
        parameters: [
            { name: 'condition', type: 'boolean', description: 'Condition to evaluate' },
            { name: 'content', type: 'content', description: 'Content to render if false' }
        ],
        examples: ['.ifnot {.hidden} {Show this}', '.ifnot {.error} {Success message}']
    },
    {
        name: 'foreach',
        description: 'Iterates over a range or collection',
        category: 'Control',
        parameters: [
            { name: 'range', type: 'range', description: 'Range or collection to iterate' },
            { name: 'variable', type: 'string', description: 'Loop variable name' },
            { name: 'content', type: 'content', description: 'Content to repeat' }
        ],
        examples: ['.foreach {0..5} n: Row .n', '.foreach {.items} item: - .item']
    },
    {
        name: 'repeat',
        description: 'Repeats content specified number of times',
        category: 'Control',
        parameters: [
            { name: 'count', type: 'number', description: 'Number of repetitions' },
            { name: 'variable', type: 'string', description: 'Counter variable name' },
            { name: 'content', type: 'content', description: 'Content to repeat' }
        ],
        examples: ['.repeat {3} i: Item .i', '.repeat {.max} n: Step .n']
    },

    // File Operations
    {
        name: 'include',
        description: 'Includes content from another file',
        category: 'File',
        parameters: [
            { name: 'path', type: 'string', description: 'Path to file to include' }
        ],
        examples: ['.include {header.qmd}', '.include {lib/utils.qmd}']
    },
    {
        name: 'read',
        description: 'Reads content from a file',
        category: 'File',
        parameters: [
            { name: 'path', type: 'string', description: 'Path to file to read' },
            { name: 'lines', type: 'range', description: 'Line range to read', optional: true }
        ],
        examples: ['.read {data.txt}', '.read {code.js} lines:{1..10}']
    },

    // Document Properties
    {
        name: 'theme',
        description: 'Sets document theme and layout',
        category: 'Document',
        parameters: [
            { name: 'theme', type: 'string', description: 'Theme name' },
            { name: 'layout', type: 'string', description: 'Layout style', optional: true }
        ],
        examples: ['.theme {darko} layout:{minimal}', '.theme {academic}']
    },
    {
        name: 'doctype',
        description: 'Sets document type',
        category: 'Document',
        parameters: [
            { name: 'type', type: 'string', description: 'Document type (slides, paged, book, article)' }
        ],
        examples: ['.doctype {slides}', '.doctype {paged}']
    },
    {
        name: 'pageformat',
        description: 'Sets page format and orientation',
        category: 'Document',
        parameters: [
            { name: 'format', type: 'string', description: 'Page format (A4, Letter, etc.)' },
            { name: 'orientation', type: 'string', description: 'Page orientation', optional: true }
        ],
        examples: ['.pageformat {A4} orientation:{landscape}', '.pageformat {Letter}']
    },
    {
        name: 'slides',
        description: 'Configures slide presentation settings',
        category: 'Document',
        parameters: [
            { name: 'transition', type: 'string', description: 'Slide transition effect', optional: true },
            { name: 'speed', type: 'string', description: 'Transition speed', optional: true }
        ],
        examples: ['.slides transition:{zoom} speed:{fast}', '.slides transition:{fade}']
    },
    {
        name: 'tableofcontents',
        description: 'Generates table of contents',
        category: 'Document',
        parameters: [
            { name: 'depth', type: 'number', description: 'Maximum heading depth', optional: true },
            { name: 'title', type: 'string', description: 'TOC title', optional: true }
        ],
        examples: ['.tableofcontents', '.tableofcontents depth:{3} title:{Contents}']
    },

    // Variables and Functions
    {
        name: 'var',
        description: 'Declares a variable',
        category: 'Variables',
        parameters: [
            { name: 'name', type: 'string', description: 'Variable name' },
            { name: 'value', type: 'any', description: 'Variable value' }
        ],
        examples: ['.var {name} {John}', '.var {count} {42}']
    },
    {
        name: 'function',
        description: 'Defines a custom function',
        category: 'Functions',
        parameters: [
            { name: 'name', type: 'string', description: 'Function name' },
            { name: 'parameters', type: 'string', description: 'Parameter list', optional: true },
            { name: 'body', type: 'content', description: 'Function body' }
        ],
        examples: ['.function {greet} to from:', '.function {double} n: .multiply {.n} {2}']
    },

    // Utilities
    {
        name: 'whitespace',
        description: 'Manages whitespace in output',
        category: 'Utility',
        parameters: [
            { name: 'type', type: 'string', description: 'Whitespace type or amount' }
        ],
        examples: ['.whitespace {1em}', '.whitespace {preserve}']
    }
];

export const QUARKDOWN_THEMES = [
    'darko', 'academic', 'minimal', 'modern', 'classic', 'elegant'
];

export const QUARKDOWN_LAYOUTS = [
    'minimal', 'standard', 'wide', 'narrow', 'centered'
];

export const QUARKDOWN_DOCTYPES = [
    'slides', 'paged', 'book', 'article', 'report'
];

export function getFunctionsByCategory(category: string): FunctionSignature[] {
    return QUARKDOWN_FUNCTIONS.filter(f => f.category === category);
}

export function getFunctionByName(name: string): FunctionSignature | undefined {
    return QUARKDOWN_FUNCTIONS.find(f => f.name === name);
}

export function getCategories(): string[] {
    return [...new Set(QUARKDOWN_FUNCTIONS.map(f => f.category))];
}