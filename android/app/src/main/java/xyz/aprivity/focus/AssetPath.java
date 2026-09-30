package xyz.aprivity.focus;

/** Maps Next.js trailing-slash exports to packaged assets without path traversal. */
final class AssetPath {
    static String resolve(String path) {
        if (path == null || path.contains("\\") || path.indexOf('\0') >= 0) return null;
        for (String segment : path.split("/")) {
            if (segment.equals("..") || segment.equals(".")) return null;
        }
        if (path.startsWith("/")) path = path.substring(1);
        if (path.isEmpty() || path.endsWith("/")) return path + "index.html";
        String last = path.substring(path.lastIndexOf('/') + 1);
        return last.contains(".") ? path : path + "/index.html";
    }
}
