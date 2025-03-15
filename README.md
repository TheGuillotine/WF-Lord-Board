# Wild Forest Lords Staking Dashboard

A dashboard to track and visualize staking statistics for Wild Forest Lords NFTs.

## Features

- View total unique stakers and NFTs staked
- Track average staking duration
- Filter Lords by species (Wolf, Owl, Raven, Boar, Fox)
- Filter Lords by rarity (Rare, Epic, Legendary, Mystic)
- Sort Lords by various metrics
- Real-time data from the blockchain

## Tech Stack

- **Framework**: Next.js with TypeScript
- **Package Manager**: pnpm
- **Styling**: TailwindCSS
- **APIs**: 
  - GraphQL (Marketplace API)
  - RPC (Ronin Chain)

## Getting Started

1. Clone the repository
   ```bash
   git clone https://github.com/komiwalnut/wild-forest-lords-staking-dashboard.git
   cd wild-forest-lords-staking-dashboard
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Start the development server
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser

## Project Structure

- `/src/components` - Reusable UI components
- `/src/hooks` - Custom React hooks
- `/src/services` - API communication
- `/src/styles` - Global styles
- `/src/pages` - Next.js pages and API routes
- `/src/utils` - Redis

## Data Flow

1. Fetch Lord data from the Marketplace GraphQL API
2. For each Lord, check its staking status via RPC call
3. Apply filters (species, rarity, duration)
4. Display data in the dashboard

## License

MIT