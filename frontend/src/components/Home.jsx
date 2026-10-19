import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            YOUR EVERYDAY FINDS, REIMAGINED
          </span>
          <h1>
            Good finds.
            <br />
            <span>Better days.</span>
          </h1>
          <p>
            Discover the things you’ll love, at prices that make sense.
            Thoughtful picks, easy shopping, all in one place.
          </p>
          <Link to="/products" className="shop-now-btn">
            Explore the collection <span aria-hidden="true">→</span>
          </Link>
          <div className="hero-perks">
            <span><strong>01</strong> Curated for you</span>
            <span><strong>02</strong> Simple, secure checkout</span>
            <span><strong>03</strong> Order updates, always</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
          <div className="hero-product hero-product-back">✦</div>
          <div className="hero-product hero-product-front">e</div>
          <div className="hero-floating-tag">
            A little something
            <br />
            for every day
          </div>
          <div className="hero-sparkle hero-sparkle-one">✳</div>
          <div className="hero-sparkle hero-sparkle-two">✦</div>
        </div>
      </section>

      <section className="home-discover">
        <div>
          <span className="home-section-kicker">A BETTER WAY TO SHOP</span>
          <h2>Find your next favorite.</h2>
          <p>Browse the collection and make room for something good.</p>
        </div>
        <Link to="/products" className="home-browse-link">
          Browse all products <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}

export default Home;