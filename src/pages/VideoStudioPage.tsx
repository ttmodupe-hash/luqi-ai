// Preserve the public Studio route as a genuine deferred entry point.
// The authoring/editor page and character-video recorder load only on demand.
import ContentStudioPage from './ContentStudioPage';
export default function VideoStudioPage() {
  return <ContentStudioPage />;
}
