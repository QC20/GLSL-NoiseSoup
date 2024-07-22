# Noise Soup

Noise Soup is an interactive web-based art project that explores the intersection of design, technology, and user interaction. Using WebGL shaders and Three.js, it creates a dynamic, visually striking experience that responds to user input.

## Features

- Real-time shader rendering
- Mouse interaction
- Responsive design

## Customization

Noise Soup is designed to be easily customizable, allowing designers and developers to experiment with various visual effects:

1. **Shader Modification**: The core of Noise Soup's visual output is controlled by the fragment shader in `index.html`. By modifying this shader, you can create entirely new visual effects. Experiment with color calculations, patterns, and mathematical functions to achieve unique results.

2. **Uniforms**: The `uniforms` object in `sketch.js` provides key inputs to the shader. You can add new uniforms to incorporate additional data into your visual design.

3. **Interaction**: Currently, Noise Soup responds to mouse movement. You could extend this to include other forms of interaction, such as touch events on mobile devices or keyboard input.

4. **Post-processing**: Consider adding post-processing effects using Three.js to further enhance the visual output.

## Getting Started

To run Noise Soup's locally:

1. Clone this repository
2. Open `index.html` in a modern web browser

No build process is required, making it easy to dive in and start experimenting!

## Design Implications

PinPortrait serves as a canvas for exploring several key areas in UX and interaction design:

- **Responsive Visuals**: The project demonstrates how visual elements can respond fluidly to user input, creating a sense of direct manipulation.
- **Performance and Perception**: By leveraging WebGL, Noise Soup achieves smooth animations even with complex visual effects, highlighting the importance of performance in UX design.
- **Accessibility Through Abstraction**: The abstract nature of the visuals opens up possibilities for creating inclusive experiences that don't rely solely on specific cultural or visual references.

We encourage designers and developers to use Noise Soup as a starting point for their own experiments in interactive visual design. Fork the project, modify the shaders, and share your creations!