import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// getLoginUrl replaced with direct /login and /register paths
import { Car, FileText, Shield, BarChart3, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (isAuthenticated) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">Carcierge</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/login">Login</a>
            </Button>
            <Button asChild>
              <a href="/register">Sign Up</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Manage Your Vehicle & Insurance with Ease
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Carcierge is your complete vehicle registration and insurance management platform. Track registrations, manage policies, store documents, and never miss important renewal dates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2">
              <a href="/login">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground">Everything you need to manage your vehicles and insurance policies</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Service 1: Vehicle Management */}
            <Card className="border-border/50 hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Car className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-lg">Vehicle Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Register and track all your vehicles in one place. Store detailed information including make, model, engine type, and more.
                </p>
              </CardContent>
            </Card>

            {/* Service 2: Registration Tracking */}
            <Card className="border-border/50 hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-lg">Registration Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track vehicle registration expiry dates. Receive automated alerts 30 days and 7 days before expiration.
                </p>
              </CardContent>
            </Card>

            {/* Service 3: Insurance Management */}
            <Card className="border-border/50 hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-lg">Insurance Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Manage multiple insurance policies per vehicle. Track coverage details, premiums, and renewal dates.
                </p>
              </CardContent>
            </Card>

            {/* Service 4: Document Management */}
            <Card className="border-border/50 hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-lg">Document Storage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Securely upload and store registration certificates, insurance cards, and vehicle photos in the cloud.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Register Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">How to Get Started</h2>
            <p className="text-lg text-muted-foreground">Simple steps to register and manage your vehicles</p>
          </div>

          <div className="space-y-8">
            {/* Step 1 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent text-white font-bold">
                  1
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">Create Your Account</h3>
                <p className="text-muted-foreground mb-3">
                  Click "Get Started" and sign in with your Manus account. Your account is created instantly — no password required.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent text-white font-bold">
                  2
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">Add Your Vehicles</h3>
                <p className="text-muted-foreground mb-3">
                  Navigate to the Vehicles section and click "Add Vehicle". Fill in the following information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Vehicle Type:</strong> Car, Bike, Truck, etc.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Make & Model:</strong> Manufacturer and model name</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Year:</strong> Manufacturing year</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Plate Number:</strong> Vehicle registration plate</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Engine Type:</strong> Petrol, Diesel, Electric, etc.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Chassis Number (VIN):</strong> Vehicle Identification Number</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Owner:</strong> Select or create the vehicle owner</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent text-white font-bold">
                  3
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">Add Registration & Insurance Details</h3>
                <p className="text-muted-foreground mb-3">
                  For each vehicle, add registration and insurance information:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Registration Number:</strong> Unique registration identifier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Issue & Expiry Dates:</strong> Registration validity period</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Insurance Provider:</strong> Name of insurance company</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Policy Number:</strong> Insurance policy identifier</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                    <span><strong>Coverage Type:</strong> Comprehensive, Third-party, etc.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent text-white font-bold">
                  4
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">Upload Documents</h3>
                <p className="text-muted-foreground">
                  Upload registration certificates, insurance cards, and vehicle photos to keep all documents in one secure location. You can access them anytime from the Documents section.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent text-white font-bold">
                  5
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-foreground mb-2">Stay Updated</h3>
                <p className="text-muted-foreground">
                  Your dashboard will automatically track expiry dates and send you alerts 30 days and 7 days before registration or insurance expiration. Never miss a renewal deadline again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Highlight */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-card/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Key Features</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Expiry Alerts</h3>
                <p className="text-muted-foreground">Automatic notifications at 30 days and 7 days before expiration</p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Cloud Storage</h3>
                <p className="text-muted-foreground">Securely store all vehicle documents in the cloud</p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Global Search</h3>
                <p className="text-muted-foreground">Quickly find vehicles and owners across your entire fleet</p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Role-Based Access</h3>
                <p className="text-muted-foreground">Admin and user roles for secure access control</p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Detailed Dashboard</h3>
                <p className="text-muted-foreground">Real-time overview of all vehicles and insurance status</p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Data Export</h3>
                <p className="text-muted-foreground">Export vehicle and insurance data to Excel format</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground">One flat annual fee — no hidden charges, no per-vehicle costs</p>
          </div>
          <div className="flex justify-center">
            <Card className="border-accent/40 shadow-lg w-full max-w-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
              <CardHeader className="text-center pt-8">
                <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-4 mx-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Most Popular
                </div>
                <CardTitle className="text-2xl">Annual Subscription</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-foreground">$50</span>
                  <span className="text-muted-foreground ml-2">/ year</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Per account — covers up to 5 vehicles</p>
              </CardHeader>
              <CardContent className="space-y-3 pb-8">
                <div className="space-y-2">
                  {[
                    "Register and manage up to 5 vehicles",
                    "Full vehicle & insurance tracking",
                    "Document cloud storage",
                    "Expiry alerts & renewal reminders",
                    "Service request management",
                    "Dedicated support",
                  ].map((feature) => (
                    <div key={feature} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4">
                  <Button size="lg" className="w-full gap-2" asChild>
                    <a href="/login">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Get in Touch</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Have questions or need support? We're here to help.
          </p>

          <Card className="border-border/50 bg-card/50">
            <CardContent className="pt-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Mail className="w-6 h-6 text-accent" />
                <a href="mailto:support@carcierge.com" className="text-lg font-semibold text-accent hover:underline">
                  support@carcierge.com
                </a>
              </div>
              <p className="text-muted-foreground mb-6">
                Email us anytime with questions, feedback, or support requests. We typically respond within 24 hours.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-20 bg-accent/5 border-t border-border/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of users managing their vehicles and insurance with Carcierge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="gap-2">
              <a href="/login">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background/50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 sm:mb-0">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-foreground">Carcierge</span>
            </div>
            <p className="text-sm text-muted-foreground text-center sm:text-right">
              © 2026 Carcierge. Vehicle & Insurance Management System.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
