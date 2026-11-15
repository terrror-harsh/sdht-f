import { Component, type ErrorInfo, type ReactNode } from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled SDHT application error.', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="session-state">
          <div className="state-icon error-icon"><CircleAlert size={24} /></div>
          <p className="eyebrow">APPLICATION ERROR</p>
          <h1>Something went wrong</h1>
          <p>The workspace could not render this screen. Reload to try again.</p>
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Reload workspace
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
