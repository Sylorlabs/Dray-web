'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Music, Zap, MessageSquare, Mic, Split, ArrowRight } from "lucide-react";
import styles from './landing.module.css';
import dynamic from 'next/dynamic';
const ThemeToggle = dynamic(() => import('../components/ThemeToggle'), { ssr: false });

export default function Home() {
  return (
    <div className={styles.landingContainer}>
      {/* Navbar */}
      <nav className={styles.navbar} aria-label="Main navigation">
        <div className={styles.logoContainer}>
          <Sparkles className={styles.logoIcon} aria-hidden="true" />
          <span className={styles.logoText}>Drey</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features">Features</a>
          <a href="#wingman">Wingman AI</a>
          <ThemeToggle />
          <Link href="/daw" className={styles.btnPrimary} aria-label="Launch Drey DAW application">Launch App</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroGlow}></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className={styles.heroContent}
        >
          <h1 className={styles.heroTitle}>
            Make Beats <span className={styles.gradientText}>In Your Browser</span>
          </h1>
          <p className={styles.heroSubtitle}>
            A simple, free DAW with <strong>AI-powered assistance</strong>.
            No downloads. No experience needed. Just start creating.
          </p>
          <div className={styles.heroActions}>
            <Link href="/daw" className={styles.btnGlow} aria-label="Start making music in Drey">
              Start Making Music <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Built for Beginners</h2>
          <p className={styles.sectionSubtitle}>No experience? No problem. Drey makes music creation accessible.</p>
        </div>

        <div className={styles.featuresGrid}>
          <FeatureCard
            icon={<Music className={styles.accentBlue} />}
            title="75+ Sound Presets"
            description="From Super Saw leads to 808 bass, with drums, keys, pads, vocals, and FX — all built-in and ready to play."
          />
          <FeatureCard
            icon={<Mic className={styles.accentGreen} />}
            title="Hum-to-MIDI"
            description="Record melodies by humming, singing, or whistling. Real-time pitch detection converts your voice to notes."
          />
          <FeatureCard
            icon={<Split className={styles.accentOrange} />}
            title="Stem Separator"
            description="Upload any song and separate it into bass, drums, vocals, and instruments. Remix anything."
          />
          <FeatureCard
            icon={<Zap className={styles.accentPink} />}
            title="Works Anywhere"
            description="Runs in your browser on any device. Your projects save locally — no account needed."
          />
          <FeatureCard
            icon={<MessageSquare className={styles.accentPurple} />}
            title="AI Assistance"
            description="Ask Wingman to generate beats, melodies, or help with your arrangement — in plain English."
          />
          <FeatureCard
            icon={<Sparkles className={styles.accentBlue} />}
            title="Pattern Generator"
            description="Generate trap beats, house grooves, chord progressions, and bass lines with one click."
          />
        </div>
      </section>

      {/* Wingman AI Highlight */}
      <section id="wingman" className={styles.wingmanHighlight}>
        <div className={styles.wingmanContent}>
          <div className={styles.wingmanBadge}>AI-Powered</div>
          <h2>Meet Wingman</h2>
          <p>
            Stuck on a beat? Just tell Wingman what you want. It can generate drum patterns,
            create melodies, add tracks, and adjust your mix — all through natural conversation.
          </p>
          <ul className={styles.wingmanList}>
            <li><Sparkles size={16} />Generate drum patterns by style</li>
            <li><Sparkles size={16} />Create chord progressions</li>
            <li><Sparkles size={16} />Add and manage tracks</li>
            <li><Sparkles size={16} />Adjust volume and panning</li>
          </ul>
        </div>
        <div className={styles.wingmanVisual}>
          <div className={styles.aiGlowOrb}></div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 Drey. A free, open-source project.</p>
          <div className={styles.footerLinks}>
            <a href="#">GitHub</a>
            <a href="#">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className={styles.featureCard}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3 className={styles.featureTitle}>{title}</h3>
      <p className={styles.featureDescription}>{description}</p>
    </div>
  );
}
