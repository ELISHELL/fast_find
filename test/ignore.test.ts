
import { expect, it, should } from 'vitest';
import ignore from 'ignore'

it('test ignore', async () => {
    const ig = ignore();
    ig.add("node_modules");

    expect(ig.ignores("node_modules")).toMatchInlineSnapshot(`true`)
    expect(ig.ignores("node_modules/")).toMatchInlineSnapshot(`true`)
    expect(ig.ignores("node_modules/123123")).toMatchInlineSnapshot(`true`)
    expect(ig.ignores("node_modules/123123.node_modules")).toMatchInlineSnapshot(`true`)

    expect(ig.ignores("sdaf/node_modules")).toMatchInlineSnapshot(`true`)
    expect(ig.ignores("sdaf/node_modules/")).toMatchInlineSnapshot(`true`)
    expect(ig.ignores("sdaf/node_modules/123123")).toMatchInlineSnapshot(`true`)

    expect(ig.ignores("sdaf/123123.node_modules/")).toMatchInlineSnapshot(`false`)
    expect(ig.ignores("sdaf/.node_modules")).toMatchInlineSnapshot(`false`)
    expect(ig.ignores(".node_modules")).toMatchInlineSnapshot(`false`)

})