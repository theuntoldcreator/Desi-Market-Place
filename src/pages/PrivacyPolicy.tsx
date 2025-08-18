import { Header } from '@/components/layout/Header';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="w-full bg-gray-50 min-h-screen">
      <Header />
      <main className="container mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-sm prose prose-sm max-w-none">
          <h1>Privacy Policy for NRI Marketplace</h1>
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to NRI Marketplace. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>

          <h2>2. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect on the platform includes:
          </p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name and email address, that you voluntarily give to us when you register with the platform.</li>
            <li><strong>Listing Data:</strong> All information you provide when creating a listing, including title, description, price, location, and uploaded images.</li>
            <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the platform, such as your IP address, your browser type, and your operating system.</li>
          </ul>

          <h2>3. Use of Your Information</h2>
          <p>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the platform to:
          </p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Display your listings to other users.</li>
            <li>Enable user-to-user communications.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the platform.</li>
          </ul>

          <h2>4. Disclosure of Your Information</h2>
          <p>
            We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. Your listing details, including contact information you provide, will be visible to other users to facilitate transactions.
          </p>

          <h2>5. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>

          <h2>6. Disclaimer of Liability</h2>
          <p>
            <strong>
              NRI Marketplace functions solely as a platform to connect buyers and sellers. We are not involved in the actual transaction between users. As a result, we have no control over the quality, safety, morality, or legality of any aspect of the items listed, the truth or accuracy of the listings, the ability of sellers to sell items, or the ability of buyers to pay for items.
            </strong>
          </p>
          <p>
            <strong>
              You agree that NRI Marketplace is not responsible or liable for any loss, damage, or dispute that may arise between you and any other user of the platform. All transactions and communications are conducted at your own risk. We strongly encourage you to follow the safety guidelines provided on our platform.
            </strong>
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us through the platform's designated support channels.
          </p>
        </div>
      </main>
    </div>
  );
}