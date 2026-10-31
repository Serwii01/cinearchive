import { describe, it, expect } from 'vitest';
import { pointsToPrevious } from '../src/lib/ui/backnav';

const O = 'https://cinearchive.es';

describe('pointsToPrevious', () => {
  it('reconoce la ficha de la que se viene: el caso del bucle entre parecidas', () => {
    expect(pointsToPrevious('/film/550-fight-club', `${O}/film/550-fight-club`, O)).toBe(true);
    expect(pointsToPrevious(`${O}/en/person/287`, `${O}/en/person/287`, O)).toBe(true);
  });

  it('conserva la consulta: otra página del listado es otra página', () => {
    expect(pointsToPrevious('/discover?page=3', `${O}/discover?page=3`, O)).toBe(true);
    expect(pointsToPrevious('/discover?page=3', `${O}/discover?page=2`, O)).toBe(false);
  });

  it('ignora la barra final y el fragmento', () => {
    expect(pointsToPrevious('/films/', `${O}/films`, O)).toBe(true);
    expect(pointsToPrevious('/films#top', `${O}/films`, O)).toBe(true);
  });

  it('si el enlace va a otra página, no retrocede', () => {
    // Llegaste a la ficha desde fuera y el botón cae a la filmoteca: hay que
    // navegar a la filmoteca, no volver a Google.
    expect(pointsToPrevious('/films', 'https://www.google.com/search?q=x', O)).toBe(false);
    expect(pointsToPrevious('/films', `${O}/search?q=x`, O)).toBe(false);
  });

  it('sin referrer o con uno ilegible, no retrocede', () => {
    expect(pointsToPrevious('/films', '', O)).toBe(false);
    expect(pointsToPrevious('/films', 'no-es-una-url', O)).toBe(false);
  });
});
