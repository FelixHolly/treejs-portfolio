# Todos

## Performance & Optimization
3. Implement lazy loading for route sections
4. Optimize 3D models (GLB compression, reduce poly count)
5. Add tree-shaking for Three.js imports (import specific modules only)
6. Optimize images and textures (use WebP format, compress PNGs)
7. Reduce performance budgets in angular.json (lower from 3mb to 1.5mb)
8. Fix memory leaks in hero.component.ts (dispose DRACOLoader, geometries, materials, textures)
9. Implement virtual scrolling if adding more content sections
10. Add service worker for caching and offline support

## Code Quality & Architecture
11. Extract calculateSizes function to src/app/utils/responsive-sizes.util.ts
12. Create constants file for magic numbers (rotation factors, scale values, animation durations)
13. Refactor contact component to use EmailService
14. Refactor projects component to use ProjectService
15. Refactor hero/projects components to use ThreeSceneService for cleanup
16. Convert inline component styles to use design tokens/CSS variables
17. Add proper TypeScript interfaces for all data structures
18. Implement proper routing instead of single-page sections
19. Consider state management (NgRx or simple signal-based store)
20. Add JSDoc comments to all public methods and services

## Testing
21. Write unit tests for all services (email.service, project.service, three-scene.service)
22. Write component tests beyond default templates
23. Add E2E tests with Playwright or Cypress
24. Implement visual regression testing for 3D scenes
25. Add test coverage reporting and set minimum thresholds
26. Test error boundary behavior with different error types

## Security & Best Practices
27. Create environment files (environment.ts, environment.prod.ts)
28. Move EmailJS credentials to environment variables
29. Move asset paths to environment configuration
30. Add Content Security Policy headers
31. Implement proper error logging service (integrate Sentry or similar)
32. Add input sanitization for contact form
33. Remove committed .DS_Store files from git history
34. Add security headers in deployment configuration

## Build & Deployment
35. Fix base-href inconsistency (angular.json vs deploy.yml)
36. Update GitHub Actions to v4 (checkout and setup-node)
37. Add staging environment deployment workflow
38. Create separate production/development builds with different configs
39. Add bundle analysis script (webpack-bundle-analyzer)
40. Implement automated bundle size monitoring
41. Add robots.txt for SEO
42. Generate sitemap.xml
43. Add meta tags for better SEO and social sharing
44. Optimize Lighthouse scores (aim for 90+ in all categories)

## Accessibility
45. Add ARIA labels to 3D canvas elements
46. Implement skip navigation links
47. Ensure full keyboard navigation support
48. Add focus indicators for all interactive elements
49. Test with screen readers (NVDA, JAWS, VoiceOver)
50. Ensure color contrast meets WCAG AA standards
51. Add alt text to all images
52. Implement reduced motion preferences for animations

## Developer Experience
53. Add Husky for git hooks
54. Configure lint-staged for pre-commit checks
55. Add commitlint for conventional commit messages
56. Create CHANGELOG.md
57. Add CONTRIBUTING.md with development guidelines
58. Set up Prettier as default formatter in VS Code settings
59. Add recommended VS Code extensions list (.vscode/extensions.json)
60. Create code snippets for common patterns
61. Add detailed README sections for local development setup
62. Document environment variable requirements
