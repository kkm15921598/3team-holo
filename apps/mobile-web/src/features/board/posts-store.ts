// Module-level posts store. Initial data comes from the mock POSTS array.
// New posts published from Board5 are prepended via `prepend` and consumed
// reactively by Board2 (board-list-screen) through `subscribe`.

import { POSTS as INITIAL_POSTS, type Post } from "@/shared/mock/data";

let _posts: Post[] = [...INITIAL_POSTS];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export const postsStore = {
  getPosts(): Post[] {
    return _posts;
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  prepend(post: Post): void {
    _posts = [post, ..._posts];
    notify();
  },
  update(post: Post): void {
    const idx = _posts.findIndex((p) => p.id === post.id);
    if (idx >= 0) {
      const next = [..._posts];
      next[idx] = post;
      _posts = next;
      notify();
    }
  },
  remove(ids: string[]): void {
    const set = new Set(ids);
    _posts = _posts.filter((p) => !set.has(p.id));
    notify();
  },
};
