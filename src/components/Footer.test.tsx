import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  const version = '1.0.0';

  describe('About link', () => {
    it('renders the About link with the correct href and label', () => {
      // Regression: Footer must use common.footer.about (not
      // nav.about) and point to the landing page.
      render(<Footer version={version} />);
      const aboutLink = screen.getByRole('link', { name: 'About' });
      expect(aboutLink).toBeInTheDocument();
      expect(aboutLink).toHaveAttribute('href', '/?page=landing');
      // The About link is internal — opening the landing page in a
      // new tab from the footer is surprising UX.
      expect(aboutLink).not.toHaveAttribute('target');
      expect(aboutLink).not.toHaveAttribute('rel');
    });
  });

  describe('Legal links', () => {
    it('renders the Privacy Policy link with the correct href and label', () => {
      render(<Footer version={version} />);
      const privacyLink = screen.getByRole('link', { name: 'Privacy Policy' });
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute('href', '/privacy.html');
    });

    it('renders the Terms of Use link with the correct href and label', () => {
      render(<Footer version={version} />);
      const termsLink = screen.getByRole('link', { name: 'Terms of Use' });
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '/terms.html');
    });
  });

  describe('Vibecoded attribution', () => {
    it('interpolates the version into the vibecoded text', () => {
      // The Trans mock returns a <span> with the interpolated
      // template. The template is "Vibecoded with love ❤️ by
      // <link>godie</link> with cursor v{{version}} ({{year}})".
      // Match on the version prefix to confirm interpolation.
      render(<Footer version={version} />);
      expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
    });

    it('interpolates the current year into the vibecoded text', () => {
      // getCurrentYear() is captured at module load time, so we
      // match dynamically rather than hardcoding the year.
      const year = String(new Date().getFullYear());
      render(<Footer version={version} />);
      expect(screen.getByText(new RegExp(`\\(${year}\\)`))).toBeInTheDocument();
    });
  });

  describe('External link security', () => {
    it('all non-About links open in a new tab with noopener noreferrer', () => {
      // The legal links (/terms.html, /privacy.html) and the
      // github link in the vibecoded text are external — they must
      // have target="_blank" + rel="noopener noreferrer" to prevent
      // tab-nabbing. The About link is internal (/?page=landing)
      // and should NOT have these attributes (opening the landing
      // page in a new tab from the footer is surprising UX).
      render(<Footer version={version} />);
      const links = screen.getAllByRole('link');
      const externalLinks = links.filter(
        (link) => link.getAttribute('href') !== '/?page=landing',
      );
      expect(externalLinks.length).toBeGreaterThan(0);
      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });
});
