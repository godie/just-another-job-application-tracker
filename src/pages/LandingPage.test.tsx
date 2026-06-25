
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LandingPage from './LandingPage';

/**
 * These tests catch CSS token breakage in CI:
 * - Shadcn semantic tokens must be present on key structural elements
 * - Brand colors (terracotta/sage) must be preserved on decorative/CTA elements
 * - No legacy earth-/sage-/terracotta- classes must leak onto non-brand elements
 */

describe('LandingPage', () => {
  const onNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });


  it('renders the hero title and subtitle', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    expect(screen.getByText('Master Your Job Search')).toBeInTheDocument();
    expect(
      screen.getByText(/The ultimate tool to track applications/)
    ).toBeInTheDocument();
  });

  it('renders Get Started button and navigates on click', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const getStartedButtons = screen.getAllByText('Get Started');
    expect(getStartedButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(getStartedButtons[0]);
    expect(onNavigate).toHaveBeenCalledWith('applications');
  });

  it('renders Enter Application buttons', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const enterButtons = screen.getAllByText('Enter Application');
    expect(enterButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Privacy Policy and Terms of Use links', () => {
    render(<LandingPage onNavigate={onNavigate} />);

    const privacyLinks = screen.getAllByText('Privacy Policy');
    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);

    const termsLinks = screen.getAllByText('Terms of Use');
    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('sets the document title via useSEO hook', () => {
    render(<LandingPage onNavigate={onNavigate} />);
    expect(document.title).toBe('Track Your Job Search — Free & Private | JAJAT');
  });


  describe('shadcn token integrity', () => {
    let container: HTMLElement;

    beforeEach(() => {
      const rendered = render(<LandingPage onNavigate={onNavigate} />);
      container = rendered.container;
    });

    it('root element uses bg-background', () => {
      const root = container.querySelector('.min-h-screen');
      expect(root).not.toBeNull();
      expect(root?.className).toMatch(/\bbg-background\b/);
    });

    it('hero title uses text-foreground', () => {
      const title = screen.getByText('Master Your Job Search');
      expect(title.className).toMatch(/\btext-foreground\b/);
    });

    it('hero subtitle uses text-muted-foreground', () => {
      const subtitle = screen.getByText(/The ultimate tool to track applications/);
      expect(subtitle.className).toMatch(/\btext-muted-foreground\b/);
    });

    it('nav links use text-muted-foreground with hover:text-foreground', () => {
      const privacyLink = screen.getAllByText('Privacy Policy')[0];
      expect(privacyLink.className).toMatch(/\btext-muted-foreground\b/);
      expect(privacyLink.className).toMatch(/\bhover:text-foreground\b/);
    });

    it('language switcher uses shadcn tokens for active/inactive states', () => {
      const enButton = screen.getByText('EN');
      expect(enButton.className).toMatch(/\bbg-primary\b/);
      expect(enButton.className).toMatch(/\btext-primary-foreground\b/);

      const esButton = screen.getByText('ES');
      expect(esButton.className).toMatch(/\bbg-background\b/);
      expect(esButton.className).toMatch(/\btext-foreground\b/);
      expect(esButton.className).toMatch(/\bhover:bg-muted\b/);
      expect(esButton.className).toMatch(/\bborder-border\b/);
    });

    it('See Features button uses border-border text-foreground hover:bg-muted', () => {
      const seeFeatures = screen.getByText('See Features');
      expect(seeFeatures.className).toMatch(/\bborder-border\b/);
      expect(seeFeatures.className).toMatch(/\btext-foreground\b/);
      expect(seeFeatures.className).toMatch(/\bhover:bg-muted\b/);
    });

    it('features section uses bg-muted/50 as background', () => {
      const features = container.querySelector('#features');
      expect(features).not.toBeNull();
      expect(features?.className).toMatch(/\bbg-muted\/50\b/);
    });

    it('feature cards use bg-card border-border hover:border-primary/30', () => {
      const cards = container.querySelectorAll('.bg-card.border.border-border');
      expect(cards.length).toBeGreaterThanOrEqual(3);

      const hasHover = Array.from(cards).some((card) =>
        card.className.includes('hover:border-primary/30')
      );
      expect(hasHover).toBe(true);
    });

    it('roadmap items use text-foreground group-hover:text-primary', () => {
      const items = Array.from(container.querySelectorAll('[class]')).filter((el) =>
        el.className.includes('group-hover:text-primary')
      );
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('footer uses bg-muted', () => {
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
      expect(footer?.className).toMatch(/\bbg-muted\b/);
    });
  });


  describe('brand color preservation', () => {
    let container: HTMLElement;

    beforeEach(() => {
      const rendered = render(<LandingPage onNavigate={onNavigate} />);
      container = rendered.container;
    });

    it('CTA buttons use terracotta brand colors', () => {
      const getStarted = screen.getAllByText('Get Started')[0];
      expect(getStarted.className).toMatch(/\bbg-terracotta-600\b/);
      expect(getStarted.className).toMatch(/\bhover:bg-terracotta-700\b/);
      expect(getStarted.className).toMatch(/\bborder-terracotta-700\b/);
    });

    it('Enter Application nav button uses terracotta brand colors', () => {
      const enterApp = screen.getAllByText('Enter Application')[0];
      expect(enterApp.className).toMatch(/\bbg-terracotta-600\b/);
    });

    it('hero gradient uses brand colors (sage + terracotta + earth)', () => {
      const blobGradient = container.querySelector('.from-sage-200');
      expect(blobGradient).not.toBeNull();
    });

    it('CTA section uses brand gradient background', () => {
      const ctaGradient = container.querySelector('.from-terracotta-500');
      expect(ctaGradient).not.toBeNull();
    });

    it('white CTA button uses terracotta text and border', () => {
      const whiteButton = container.querySelector('.bg-white.text-terracotta-700');
      expect(whiteButton).not.toBeNull();
    });

    it('features section label uses terracotta accent text', () => {
      const featuresLabel = container.querySelector('.text-terracotta-600');
      expect(featuresLabel).not.toBeNull();
      expect(featuresLabel?.textContent?.trim()).toBe('Features');
    });

    it('roadmap section label uses terracotta accent text', () => {
      const roadmapLabel = screen.getByText('Roadmap');
      expect(roadmapLabel.className).toMatch(/\btext-terracotta-600\b/);
    });

    it('decorative SVG patterns use brand colors', () => {
      const decorativeSvgs = container.querySelectorAll('[aria-hidden="true"] svg');
      expect(decorativeSvgs.length).toBeGreaterThanOrEqual(1);

      const hasBrandColor = Array.from(decorativeSvgs).some(
        (svg) =>
          svg.className.includes('text-sage-') ||
          svg.className.includes('text-terracotta-')
      );
      expect(hasBrandColor).toBe(true);
    });
  });


  describe('no legacy class leakage on structural elements', () => {
    let container: HTMLElement;

    beforeEach(() => {
      const rendered = render(<LandingPage onNavigate={onNavigate} />);
      container = rendered.container;
    });

    it('hero title does not use legacy earth text classes', () => {
      const title = screen.getByText('Master Your Job Search');
      expect(title.className).not.toMatch(/\btext-earth-/);
      expect(title.className).not.toMatch(/\btext-sage-/);
    });

    it('hero subtitle does not use legacy earth text classes', () => {
      const subtitle = screen.getByText(/The ultimate tool to track applications/);
      expect(subtitle.className).not.toMatch(/\btext-earth-/);
    });

    it('nav links do not use legacy earth hover classes', () => {
      const navLinks = container.querySelectorAll('nav a');
      navLinks.forEach((link) => {
        expect(link.className).not.toMatch(/\bhover:text-earth-/);
        expect(link.className).not.toMatch(/\bhover:bg-earth-/);
      });
    });

    it('footer does not use legacy earth background classes', () => {
      const footer = container.querySelector('footer');
      expect(footer).not.toBeNull();
      expect(footer!.className).not.toMatch(/\bbg-earth-/);
    });

    it('features section background does not use legacy earth classes', () => {
      const features = container.querySelector('#features');
      expect(features).not.toBeNull();
      expect(features!.className).not.toMatch(/\bbg-earth-/);
    });

    it('no structural text elements use legacy sage text classes', () => {
      const headings = container.querySelectorAll('h1, h2, h3');
      headings.forEach((h) => {
        expect(h.className).not.toMatch(/\btext-sage-/);
      });

      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach((p) => {
        if (!p.className.includes('text-terracotta')) {
          expect(p.className).not.toMatch(/\btext-sage-/);
        }
      });
    });

    it('no elements use border-earth-* classes', () => {
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        expect(el.className).not.toMatch(/\bborder-earth-/);
      });
    });
  });


  it('matches LandingPage structural snapshot', () => {
      const { container } = render(<LandingPage onNavigate={onNavigate} />);

      const structure = {
        ctaButtons: container.querySelectorAll('.bg-terracotta-600').length,
        featureCards: container.querySelectorAll('.bg-card.border.border-border').length,
        roadmapItems: container.querySelectorAll('.group-hover\\:text-primary, [class*="group-hover:text-primary"]').length ||
          Array.from(container.querySelectorAll('[class]')).filter((el) =>
            el.className.includes('group-hover:text-primary')
          ).length,
        footerSections: container.querySelectorAll('footer').length,
        navLinks: container.querySelectorAll('nav a').length,
        decorativeSvgs: container.querySelectorAll('[aria-hidden="true"] svg').length,
      };

      expect(structure).toMatchSnapshot();
    });
});
