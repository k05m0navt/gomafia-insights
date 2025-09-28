# TECHNICAL SPECIFICATION - GOMAFIA ANALYTICS

## PROJECT OVERVIEW
**Name**: GoMafia Analytics Web App
**Type**: Analytics Dashboard for gomafia.pro data
**Complexity**: Level 3 (Complex System)
**Technology**: Next.js + TypeScript (Context7 Removed)

## DATA SOURCE SPECIFICATION

### gomafia.pro Data Structure
**Access Method**: HTML parsing of __NEXT_DATA__ script tag
**Data Format**: JSON embedded in server-side rendered page
**Update Frequency**: Real-time (page refresh based)

#### Available Data Types
```typescript
interface TopUser {
  id: string;
  login: string;
  elo: string;
  is_paid: string;
  icon_type: string;
  icon: string;
  paid_account: string;
  tournaments_played: string;
  tournaments_score: string;
  title: string; // Club name
  total_rows: string;
  avatar_link: string;
  tournaments_gg: number[];
}

interface TopClub {
  id: string;
  title: string;
  country: string;
  city: string;
  elo_average: string;
  club_score: string;
  total_rows: string;
  is_fsm_paid: string;
  avatar_link: string;
}

interface LandingData {
  top_users: TopUser[];
  top_clubs: TopClub[];
  prize_total: number;
  prize_gg: number;
  broadcasts: Array<{title: string; link: string}>;
  club_status: string;
  is_fsm_paid: boolean;
}
```

## ARCHITECTURE SPECIFICATION

### Core Architecture Pattern
- **Type**: JAMstack with SSR capabilities
- **Rendering**: Hybrid (SSR for SEO, CSR for interactivity)
- **State Management**: Client-side with Zustand
- **Data Flow**: Fetch → Validate → Cache → Render

### Component Architecture
```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── charts/          # Chart components (Chart.js)
│   ├── dashboard/       # Dashboard-specific components
│   └── layout/          # Layout components
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── services/            # API and data services
├── stores/              # Zustand stores
├── types/               # TypeScript type definitions
└── validation/          # Zod schemas
```

## TECHNOLOGY STACK SPECIFICATION

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14+ | React framework with SSR |
| TypeScript | 5+ | Type safety and developer experience |
| React | 18+ | UI library |
| Node.js | 18+ LTS | Runtime environment |

### Supporting Libraries
| Library | Purpose | Integration |
|---------|---------|-------------|
| Tailwind CSS | Styling framework | PostCSS integration |
| Chart.js | Data visualization | react-chartjs-2 wrapper |
| Zustand | State management | TypeScript-native |
| Zod | Schema validation | Runtime type checking |

### Development Tools
| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Jest | Unit testing |
| React Testing Library | Component testing |

## DATA FETCHING SPECIFICATION

### API Strategy
**Primary**: Next.js API routes as CORS proxy
**Fallback**: Direct client-side fetching with error handling

### Implementation Pattern
```typescript
// API Route: /api/gomafia-data
export async function GET() {
  const response = await fetch('https://gomafia.pro');
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);
  
  if (match) {
    const data = JSON.parse(match[1]);
    return Response.json(data.props.pageProps.serverData.landingData);
  }
  
  throw new Error('Data not found');
}
```

### Caching Strategy
- **Client-side**: SWR or React Query for data caching
- **Revalidation**: 5-minute intervals for live data
- **Fallback**: Local storage for offline capability

## PERFORMANCE SPECIFICATION

### Optimization Targets
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3s

### Implementation Strategies
1. **Code Splitting**: Route-based and component-based
2. **Image Optimization**: Next.js Image component
3. **Data Virtualization**: For large datasets
4. **Memoization**: React.memo for expensive components

## DEPLOYMENT SPECIFICATION

### Platform: Vercel (Recommended)
**Reasoning**: Optimized for Next.js, automatic deployments, edge functions

### Environment Variables
```env
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api
GOMAFIA_PROXY_ENABLED=true
```

### Build Configuration
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "lint": "next lint",
    "test": "jest"
  }
}
```

## SECURITY SPECIFICATION

### Data Protection
- **Input Validation**: Zod schemas for all external data
- **CORS Handling**: Controlled via API routes
- **Environment Variables**: Secure storage for sensitive data

### Content Security Policy
```javascript
const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval';"
}
```

## TESTING SPECIFICATION

### Testing Strategy
- **Unit Tests**: Jest for utility functions
- **Component Tests**: React Testing Library
- **Integration Tests**: API route testing
- **E2E Tests**: Playwright (optional)

### Test Coverage Targets
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 85%+
- **Lines**: 80%+

## ACCESSIBILITY SPECIFICATION

### WCAG 2.1 AA Compliance
- **Semantic HTML**: Proper heading hierarchy
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Readers**: ARIA labels and descriptions
- **Color Contrast**: 4.5:1 minimum ratio

### Implementation Tools
- **ESLint Plugin**: eslint-plugin-jsx-a11y
- **Testing**: axe-core integration
- **Validation**: Lighthouse accessibility audits

## BROWSER SUPPORT SPECIFICATION

### Target Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Progressive Enhancement
- **Core Functionality**: Works without JavaScript
- **Enhanced Experience**: Full interactivity with JavaScript
- **Fallbacks**: Graceful degradation for unsupported features

This specification serves as the technical foundation for implementation and will be referenced throughout the development process.

