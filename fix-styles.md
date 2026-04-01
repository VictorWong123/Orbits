# UI Prompt: Orbit - The "Cozy" Version

## Objective
Rewrite the **Orbit** UI to feel friendly, welcoming, and cozy. The app should feel like a digital garden or a personal journal, not a rigid tool.

## Visual Guidelines (STRICT)
- **Colors**: 
  - Main Theme: Sage Green (`#86A789`).
  - Background: Soft Cream/Off-white (`#FDFBF7`).
  - Text: Deep Forest Green (`#1A3021`).
- **Shapes**: Use `rounded-3xl` (24px+) for all cards, inputs, and buttons. Avoid sharp 90-degree corners.
- **Atmosphere**: Use generous padding (`p-6` or more) to let the content "breathe."

## 1. Homepage (The "Circle")
- **List Items**: 
  - Instead of a plain list, use soft-shadow cards with a cream background.
  - Avatars should be a soft, muted green circle with dark forest-green initials.
  - The "Last edit" text should be in an italic, friendly font style.
  - Tags should be pill-shaped with a sage-green background and white text.

## 2. Profile & New Note Screen
- **Inputs**: Use rounded "pill" shapes for search bars and text fields. 
- **The "New Note" Header**: Use a warm, welcoming font size. 
- **The "Sarah Chen" Tag**: Make it look like a soft bubble, not a button.
- **Dividers**: Use very light, organic green lines (`bg-green-100`) instead of gray.

## Technical Instructions
- Use **Tailwind CSS**.
- Use **Lucide React** icons, but wrap them in `bg-green-50` circles to make them look friendlier.
- Implement the "Notes" and "Info" toggle as a sliding pill-shaped switch.

**Please rebuild the Homepage and Note screen using this warm, green, organic aesthetic.**