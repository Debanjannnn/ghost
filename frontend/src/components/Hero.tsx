export default function Hero() {
  return (
    <section className="min-h-[80vh] overflow-hidden relative" style={{ background: `url('/test-bg-1.png') center/cover no-repeat, #101010` }}>
      <div className="absolute bottom-0 left-0 right-0 h-[500px] z-[1]" style={{ background: 'linear-gradient(to top, #101010 0%, #101010e6 20%, #10101099 50%, #10101033 75%, transparent 100%)' }} />
    </section>
  );
}
