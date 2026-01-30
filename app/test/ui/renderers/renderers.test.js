import JSONRenderer from '../../../src/ui/renderers/json-renderer.js';
import TreeRenderer from '../../../src/ui/renderers/tree-renderer.js';

describe('JSONRenderer', () => {
  let renderer;
  let container;

  beforeEach(() => {
    renderer = new JSONRenderer();
    container = document.createElement('div');
  });

  it('initializes and applies classes', () => {
    renderer.init(container, { mode: 'explore', theme: 'light' });
    expect(container.className).toContain('gs-json-renderer');
  });

  it('renders JSON snapshot into pre element', () => {
    renderer.init(container, {});
    const snapshot = { entities: [{ id: 'e1', type: 'Person' }], relations: [] };
    renderer.render(snapshot);
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();
    expect(pre.textContent).toContain('"id": "e1"');
  });

  it('updates theme styles', () => {
    renderer.init(container, { theme: 'light' });
    renderer.setTheme('dark');
    expect(container.style.background).toBeDefined();
  });
});

describe('TreeRenderer', () => {
  let renderer;
  let container;

  beforeEach(() => {
    renderer = new TreeRenderer();
    container = document.createElement('div');
  });

  it('initializes tree container', () => {
    renderer.init(container, {});
    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
  });

  it('renders entities as tree nodes', () => {
    renderer.init(container, {});
    const snapshot = { entities: [{ id: 'n1', type: 'Thing', metadata: { title: 'Node1' } }], relations: [] };
    renderer.render(snapshot);
    const node = container.querySelector('li div');
    expect(node).not.toBeNull();
    expect(node.textContent).toContain('Node1');
  });

  it('emits nodeClicked when node clicked', (done) => {
    renderer.init(container, {});
    const snapshot = { entities: [{ id: 'n2', type: 'Thing', metadata: { title: 'Node2' } }], relations: [] };
    renderer.render(snapshot);

    container.addEventListener('renderer:nodeClicked', (ev) => {
      expect(ev.detail.entityId).toBe('n2');
      done();
    });

    const nodeDiv = container.querySelector('li div');
    expect(nodeDiv).not.toBeNull();
    nodeDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  it('emits relationClicked when relation clicked', (done) => {
    renderer.init(container, {});
    const snapshot = { entities: [], relations: [{ id: 'r1', type: 'link', from: 'a', to: 'b' }] };
    renderer.render(snapshot);

    container.addEventListener('renderer:relationClicked', (ev) => {
      expect(ev.detail.relationId).toBe('r1');
      done();
    });

    // Relations are rendered in nested ul list; select the relations list
    const uls = container.querySelectorAll('ul');
    const relLi = uls.length > 1 ? uls[1].querySelector('li') : null;
    expect(relLi).not.toBeNull();
    if (relLi) {
      relLi.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
});
