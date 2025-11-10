# 💬 Strudel Comment Support Documentation

## ✅ Comment Support Added!

Strudel files now have full comment support with both single-line and multi-line comments, including proper syntax highlighting and VS Code integration.

## 📝 **Comment Syntax**

### **Single-line Comments**
Use `//` for single-line comments:

```javascript
// This is a single-line comment
sound("bd hh sn oh").fast(2)

stack(
  note("C3"), // Inline comment
  sound("bass") // Another inline comment
)
```

### **Multi-line Comments**
Use `/* */` for block comments:

```javascript
/*
This is a multi-line comment
that spans multiple lines
*/

sound("kick snare")
  .gain(0.8) /* inline block comment */
  .lpf(2000)

/*
Complex pattern explanation:
- First layer: bass drum pattern
- Second layer: snare on beats 2 and 4
- Effects: low-pass filter and reverb
*/
```

## 🎨 **Syntax Highlighting**

Comments are now properly highlighted in Strudel files with:
- **Distinct color** - Comments appear in a muted color (typically gray/green)
- **Proper scoping** - Comments are recognized as `comment.line` and `comment.block`
- **Nested support** - Comments work within code blocks and expressions

## ⌨️ **VS Code Integration**

### **Built-in Keyboard Shortcuts:**
- **Toggle Line Comment**: `Ctrl+/` (Windows/Linux) or `Cmd+/` (Mac)
- **Toggle Block Comment**: `Shift+Alt+A` (Windows/Linux) or `Shift+Option+A` (Mac)

### **How to Use:**
1. **Single-line**: Place cursor on line and press `Ctrl+/`
2. **Multi-line**: Select text and press `Shift+Alt+A`
3. **Toggle**: Use same shortcuts to uncomment

## 📁 **File Support**

Comment support is available for all Strudel file types:
- **`.str`** - Strudel script files
- **`.std`** - Strudel document files  
- **`.strudel`** - Strudel files

## 🎯 **Use Cases**

### **Code Documentation**
```javascript
// Define the main groove pattern
const groove = stack(
  sound("bd").n("0 ~ 0 ~"), // Kick on 1 and 3
  sound("sn").n("~ 0 ~ 0"), // Snare on 2 and 4
  sound("hh").n("0 0 0 0").gain(0.3) // Hi-hats on every beat
)

/*
Apply effects chain:
1. Low-pass filter for warmth
2. Reverb for space
3. Slight delay for groove
*/
groove
  .lpf(1200)
  .reverb(0.2)
  .delay(0.125)
```

### **Pattern Explanation**
```javascript
// Euclidean rhythm: 3 hits in 8 steps
sound("perc").struct(euclidean(3, 8))

/*
Scale progression:
- C major for verse
- A minor for chorus
- F major for bridge
*/
note("0 2 4 7").scale("C:major")
```

### **Temporary Code Disable**
```javascript
stack(
  sound("kick"), // Main beat
  // sound("snare"), // Temporarily disabled
  sound("hihat").fast(2)
)

/*
// Alternative pattern - keep for later
sound("bass")
  .n("C2 F2 G2 C3")
  .gain(0.8)
*/
```

### **Configuration Notes**
```javascript
// BPM and timing setup
setcps(120/60/4) // 120 BPM

/*
Audio settings:
- Gain: comfortable listening level
- Filter: remove harsh frequencies
- Pan: stereo spread for width
*/
```

## 🔧 **Technical Implementation**

### **Language Configuration:**
```json
{
  "comments": {
    "lineComment": "//",
    "blockComment": [ "/*", "*/" ]
  }
}
```

### **Syntax Highlighting:**
```json
{
  "name": "comment.line.double-slash.strudel",
  "begin": "//",
  "end": "$"
},
{
  "name": "comment.block.strudel", 
  "begin": "/\\*",
  "end": "\\*/"
}
```

## 💡 **Best Practices**

### **Use Comments For:**
- **Pattern explanations** - Describe what each pattern does
- **Parameter documentation** - Explain effect parameters and values
- **Temporary disabling** - Comment out code without deleting
- **Section headers** - Organize complex compositions
- **Performance notes** - Instructions for live coding

### **Comment Style Guide:**
```javascript
// Short, descriptive comments for single lines
const bass = note("C1 F1 G1 C2").sound("bass")

/*
Longer explanations for complex sections
Use proper formatting and clear language
*/

// TODO: Add more percussion layers
// FIXME: Timing seems off in this section
// NOTE: This pattern works best at 140+ BPM
```

## ✨ **Result**

Strudel files now have professional-grade comment support including:
- ✅ **Proper syntax highlighting** for both comment types
- ✅ **VS Code keyboard shortcuts** for toggling comments
- ✅ **Language server integration** for smart commenting
- ✅ **Consistent styling** across all Strudel file types

Perfect for documenting your live coding patterns, organizing complex compositions, and collaborating with other live coders! 🎵💻