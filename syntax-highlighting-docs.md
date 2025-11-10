# Syntax Highlighting Documentation

## ✨ Enhanced Syntax Highlighting Added!

The Strudel VS Code extension now includes comprehensive syntax highlighting for both Strudel and Hydra languages, making your live coding experience more visually appealing and easier to read.

## 🌀 Strudel Syntax Highlighting

### Function Categories (Color-coded):

**🟣 Core Functions** (Purple)
- `sound`, `note`, `s`, `n`
- `stack`, `slowcat`, `fastcat`, `sequence`, `seq`, `cat`
- `pure`, `silence`, `struct`, `euclidean`

**🔵 Pattern Manipulation** (Blue)
- `slow`, `fast`, `speed`, `early`, `late`
- `jux`, `rev`, `rev2`, `palindrome`
- `iter`, `ply`, `striate`, `chop`, `slice`, `splice`
- `every`, `sometimes`, `often`, `rarely`

**🟢 Effects** (Green)
- Audio: `gain`, `pan`, `delay`, `reverb`
- Filters: `lpf`, `hpf`, `bpf`, `cutoff`, `resonance`
- Distortion: `shape`, `crush`, `distort`, `triode`

**🟠 Musical** (Orange)
- `scale`, `chord`, `voicing`, `mode`, `key`
- `transpose`, `octave`, `semitones`, `tuning`

**🔵 Time Control** (Cyan)
- `cpm`, `bpm`, `segment`, `compress`
- `hurry`, `linger`, `swing`, `density`

### Special Highlighting:

- **Notes**: `C4`, `Dm`, `F#7` - Musical note patterns
- **Chords**: `Cmaj7`, `Am`, `G7` - Chord notation
- **Numbers**: Numeric values in patterns
- **Operators**: Pattern-specific operators like `|`, `*`, `+`

## 🌊 Hydra Syntax Highlighting

### Function Categories (Color-coded):

**🟣 Source Functions** (Purple)
- `osc` - Oscillator patterns
- `noise` - Noise textures
- `gradient` - Color gradients  
- `shape` - Geometric shapes
- `voronoi` - Voronoi diagrams
- `src`, `solid` - Source utilities

**🔵 Geometry** (Blue)
- `rotate`, `scale`, `repeat`, `repeatX`, `repeatY`
- `kaleid`, `scroll`, `scrollX`, `scrollY`
- `pixelate`, `posterize`, `shift`, `mask`

**🟢 Color** (Green)
- `brightness`, `contrast`, `color`, `colorama`
- `saturate`, `desaturate`, `invert`, `luma`
- `thresh`, `r`, `g`, `b`, `a`

**🟠 Blend** (Orange)
- `add`, `sub`, `layer`, `blend`
- `mult`, `diff`, `mask`

**🔵 Modulate** (Cyan)
- `modulate`, `modulateRepeat`, `modulateKaleid`
- `modulateScale`, `modulateRotate`, `modulatePixelate`

**🔴 Output** (Red)
- `out`, `render`
- **Buffer Variables**: `o0`, `o1`, `o2`, `o3`, `s0`, `s1`, `s2`, `s3`

**⚙️ Control** (Gray)
- `speed`, `bpm`, `setResolution`, `hush`
- **Time Variables**: `time`, `mouse`, `audio`

**📊 Arrays** (Teal)
- `fast`, `smooth`, `fit`, `offset`, `ease`

## 📁 File Types

### Strudel Files
- `.str` - Strudel scripts
- `.std` - Strudel documents  
- `.strudel` - Strudel files

### Hydra Files
- `.hydra` - Hydra visual scripts

## 🎨 Visual Features

### Enhanced Readability
- **Function categories** are color-coded for quick identification
- **String patterns** have special highlighting for Strudel notation
- **Numeric values** are highlighted distinctly
- **Comments** use standard JavaScript comment styling

### Smart Context
- Different syntax rules apply based on file type
- Hydra files show Hydra-specific patterns and functions
- Strudel files highlight musical and audio concepts

### Code Structure
- **Brackets and parentheses** are properly matched
- **Auto-closing pairs** for quotes and brackets
- **Proper indentation** support for nested patterns

## 🚀 Usage

### Testing Syntax Highlighting

1. **Open Strudel files**: `syntax-demo.strudel`
   - See musical functions, effects, and pattern notation highlighted

2. **Open Hydra files**: `syntax-demo.hydra`
   - See visual functions, geometry transforms, and color operations highlighted

3. **Start typing**: Autocompletion works alongside syntax highlighting for the complete experience

### Best Practices

- Use **descriptive variable names** - they'll be highlighted appropriately
- **Group related functions** - syntax highlighting makes patterns more readable
- **Leverage color coding** - quickly identify function categories while coding

## 🔧 Technical Details

- **TextMate grammars** provide the syntax highlighting rules
- **Scoped highlighting** ensures functions appear correctly in context
- **JavaScript base** maintains compatibility with existing JS tools
- **Separate configurations** for Strudel and Hydra optimize each language

The syntax highlighting makes live coding more intuitive by providing visual cues for different types of functions and helping you quickly identify the structure of your code!