package xyz.aprivity.focus;

import org.junit.Test;
import static org.junit.Assert.*;

public class AssetPathTest {
    @Test public void loadsHomeNestedRoutesAndNextAssets() {
        assertEquals("index.html", AssetPath.resolve(""));
        assertEquals("history/index.html", AssetPath.resolve("history/"));
        assertEquals("more/plan-image/index.html", AssetPath.resolve("more/plan-image"));
        assertEquals("_next/static/app.js", AssetPath.resolve("_next/static/app.js"));
        assertEquals("history/index.txt", AssetPath.resolve("history/index.txt"));
    }
    @Test public void rejectsTraversalAndInvalidPaths() {
        assertNull(AssetPath.resolve("../secret"));
        assertNull(AssetPath.resolve("more/../secret"));
        assertNull(AssetPath.resolve("more\\secret"));
        assertNull(AssetPath.resolve("bad\0path"));
    }
}
