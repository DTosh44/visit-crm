import App from './App'
import { CRMProvider } from './store'
import { AuthProvider } from './auth'
import { FeatureProvider } from './features'
import { PlatformProvider } from './platform'

export function WorkspaceRoot(){return <AuthProvider><FeatureProvider><CRMProvider><PlatformProvider><App/></PlatformProvider></CRMProvider></FeatureProvider></AuthProvider>}
