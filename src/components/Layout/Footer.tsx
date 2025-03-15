export function Footer() {
  return (
    <footer>
      <div className="container mx-auto">
        <p>
          Wild Forest Lord Staking Tracker | Contract:{' '}
          <a 
            href={`https://explorer.roninchain.com/address/0xfb597d6fa6c08f5434e6ecf69114497343ae13dd`}
            target="_blank"
            rel="noopener noreferrer"
            className="contract-link"
          >
            0xfb597d6fa6c08f5434e6ecf69114497343ae13dd
          </a>
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} | Made with ❤️ by Player 222
        </p>
      </div>
    </footer>
  );
}