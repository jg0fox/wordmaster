import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wordwrangler Game Report - Design Studio West',
  description: 'Game report from the Design Studio West Wordwrangler session on December 12, 2024',
};

export default function DesignStudioReportPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#FAFAF5] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12 pb-8 border-b-2 border-[#FFE500]">
          <h1 className="text-4xl font-bold text-[#FFE500] mb-2" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            🎯 Wordwrangler Game Report
          </h1>
          <div className="text-[#FAFAF5]/60 text-lg space-x-6">
            <span><strong>Design Studio West</strong></span>
            <span>📅 December 12, 2024</span>
            <span>🎮 Game Code: BYU4KE</span>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { value: '11', label: 'Players' },
            { value: '5', label: 'Rounds' },
            { value: '55', label: 'Submissions' },
            { value: '3:00', label: 'Timer/Round' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-6 bg-[#1a1a24] border border-[#2d2d3a] rounded-xl">
              <div className="text-3xl font-bold text-[#FFE500]">{stat.value}</div>
              <div className="text-sm text-[#FAFAF5]/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Final Leaderboard */}
        <h2 className="text-2xl font-bold text-[#FFE500] mb-4 pb-2 border-b border-[#2d2d3a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          🏆 Final Leaderboard
        </h2>
        <div className="space-y-3 mb-8">
          {[
            { rank: '👑', avatar: '🦋', name: 'gian', score: 20, winner: true },
            { rank: '#2', avatar: '✨', name: 'Melissa', score: 19 },
            { rank: '#3', avatar: '🦄', name: 'DERK', score: 18 },
            { rank: '#4', avatar: '🎯', name: 'Rob Base', score: 17 },
            { rank: '#5', avatar: '✨', name: 'Milldawg', score: 16 },
            { rank: '#6', avatar: '🐼', name: 'kung fu panda', score: 15 },
            { rank: '#6', avatar: '🐶', name: 'halina', score: 15 },
            { rank: '#8', avatar: '🐸', name: 'eleni', score: 13 },
            { rank: '#8', avatar: '🦊', name: 'Sabrina', score: 13 },
            { rank: '#10', avatar: '🐸', name: 'Aaron', score: 12 },
            { rank: '#11', avatar: '🦊', name: 'Tim', score: 11 },
          ].map((entry) => (
            <div
              key={entry.name}
              className={`flex items-center gap-4 p-4 bg-[#1a1a24] border rounded-lg ${
                entry.winner ? 'border-[#FFE500] bg-gradient-to-r from-[#FFE500]/10 to-transparent' : 'border-[#2d2d3a]'
              }`}
            >
              <div className="text-2xl font-bold w-10 text-center">{entry.rank}</div>
              <div className="text-2xl">{entry.avatar}</div>
              <div className="flex-1 font-medium">{entry.name}</div>
              <div className="text-xl font-bold text-[#FFE500]">{entry.score} pts</div>
            </div>
          ))}
        </div>

        {/* Taskmaster Reflection */}
        <h2 className="text-2xl font-bold text-[#FFE500] mb-4 pb-2 border-b border-[#2d2d3a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          🎭 The Taskmaster Reflects
        </h2>
        <div className="bg-[#1a1a24] border border-[#FFE500] rounded-xl p-6 mb-8 shadow-[0_0_20px_rgba(255,229,0,0.1)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://media.wbur.org/wp/2020/05/Greg-and-Alex-CROPPED-1000x709.jpg"
            alt="Greg Davies and Alex Horne"
            className="w-32 h-auto mx-auto rounded-lg border-2 border-[#FFE500] mb-2"
          />
          <p className="text-center text-xs text-[#FAFAF5]/30 mb-4">
            Image: <a href="https://media.wbur.org/wp/2020/05/Greg-and-Alex-CROPPED-1000x709.jpg" target="_blank" rel="noopener noreferrer" className="hover:text-[#FAFAF5]/50">WBUR</a>
          </p>

          <blockquote className="text-lg italic p-4 bg-[#FFE500]/5 border-l-4 border-[#FFE500] my-4">
            &ldquo;Right, so apparently twelve of you played five rounds and managed to score a collective zero points. That&apos;s genuinely impressive—like watching twelve people fail to pour water out of a boot with instructions on the heel.&rdquo;
          </blockquote>

          <h3 className="text-xl font-bold text-[#FF2E6C] mb-2">💡 The Great Microwave Massacre</h3>
          <p className="text-[#FAFAF5]/80 mb-4">
            Half of you tried to teach aliens about microwaves, and Rob Base suggested they cook human heads in them. Meanwhile, kung fu panda wrote a shopping cart haiku comparing emptiness to the human soul. This is what happens when content designers are left unsupervised.
          </p>
          <p className="text-[#FAFAF5]/60 italic mb-4">
            &ldquo;Did any of you actually read the task descriptions, or did you all collectively decide that &apos;patronizing error message&apos; meant &apos;threaten the user&apos;s entire bloodline&apos;?&rdquo;
          </p>

          <blockquote className="text-lg italic p-4 bg-[#FFE500]/5 border-l-4 border-[#FFE500] mt-6">
            &ldquo;Next time, maybe try writing something that wouldn&apos;t make a robot weep—though I&apos;ll admit, &apos;wiggle that wheel baby&apos; for a shopping cart has a certain demented charm.&rdquo;
          </blockquote>
        </div>

        {/* Round by Round */}
        <h2 className="text-2xl font-bold text-[#FFE500] mb-4 pb-2 border-b border-[#2d2d3a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          📝 Round by Round Breakdown
        </h2>

        {/* Round 1 */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#FF2E6C] mb-3">Round 1: Microwave Instructions for Aliens</h3>
          <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold">Microwave Instructions for Aliens</span>
              <span className="text-xs px-3 py-1 bg-[#2D1B69] text-[#FFE500] rounded-full">instructional</span>
            </div>
            <p className="text-[#FAFAF5]/60 mb-2">Write step-by-step instructions for using a microwave for someone who has never seen one and has no concept of &quot;electricity&quot; or &quot;radiation.&quot; Max 5 steps.</p>
            <p className="text-sm text-[#FAFAF5]/40 italic">Judging: Actually functional instructions; Creative explanations; Would help an alien; UX writing brevity</p>
          </div>

          <Submission avatar="🐸" name="eleni">
            <p className="font-semibold mb-2">How to Make Food Hot Using the Magic Box:</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Open the door by pulling the handle on the front—it will swing toward you like a cupboard.</li>
              <li>Place your food on the glass plate inside (the spinning circle) and close the door until it clicks shut.</li>
              <li>Look at the numbered buttons on the front and press the numbers that match how many minutes you want.</li>
              <li>Press the button labeled &quot;START&quot; and step back—you&apos;ll hear humming sounds and see a glowing light inside.</li>
              <li>When it beeps loudly, open the door carefully and remove your food using cloth because it will be very hot.</li>
            </ol>
          </Submission>

          <Submission avatar="🦄" name="DERK">
            <p>1. cooking is overrated; eat your food raw</p>
          </Submission>

          <Submission avatar="🎯" name="Rob Base">
            <p>Pull handle. Put a human head inside. Press the big red button. That will cook the head. If head is undercooked. Press red button again. Enjoy.</p>
          </Submission>

          <Submission avatar="✨" name="Milldawg">
            <ol className="list-decimal ml-5 space-y-1">
              <li>Open the door and put your cold thing inside (NO METAL ALLOWED)</li>
              <li>Press the &quot;30 second&quot; button enough times to reach the desired time to cook</li>
              <li>Wait until the sound is made</li>
              <li>Test for hotness (in your mouth or other orifice for heat sensitivity)</li>
              <li>Add 30 seconds if required. Otherwise enjoy!</li>
            </ol>
          </Submission>

          <Submission avatar="🐸" name="Aaron">
            <p>Microwaves are a great way for you and your interstellar allies to dry off after splashing down to Earth for an invasion.</p>
            <p className="mt-2">To use a microwave:</p>
            <ol className="list-decimal ml-5">
              <li>Pull the lever, then open the door.</li>
              <li>Crawl, ooze, or fly into the small room inside.</li>
              <li>Have your friend select the <strong>Start</strong> button.</li>
            </ol>
          </Submission>
        </div>

        {/* Round 2 */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#FF2E6C] mb-3">Round 2: The Most Patronizing Error Message</h3>
          <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold">The Most Patronizing Error Message</span>
              <span className="text-xs px-3 py-1 bg-[#2D1B69] text-[#FFE500] rounded-full">error_messages</span>
            </div>
            <p className="text-[#FAFAF5]/60 mb-2">Write an error message that is technically helpful but deeply condescending. The user has entered an invalid email format.</p>
            <p className="text-sm text-[#FAFAF5]/40 italic">Judging: Communicates error; Level of condescension; Still usable; Creativity of insult</p>
          </div>

          <Submission avatar="🦊" name="Tim">
            <p>Are you freaking kidding me?</p>
            <p className="mt-2">You seriously don&apos;t know what an email is? Are you that dumb that you need me to spell it out?</p>
            <p className="mt-2">Try again stupid</p>
          </Submission>

          <Submission avatar="✨" name="Melissa">
            <p>Bless. Is this the first time you&apos;ve seen an email? That&apos;s ok, fish don&apos;t climb trees do they, sweetheart?</p>
            <p className="mt-2">Emails have to have @ and end in .com, .edu, dot something. Why don&apos;t you go back and try and read a little more closely?</p>
          </Submission>

          <Submission avatar="🦋" name="gian">
            <p>Wow, you can&apos;t do anything right can you? So, because you clearly didn&apos;t know, for the computer to understand what the hell you&apos;re doing, <em>you have to write it in a way it understands it</em>.</p>
            <p className="mt-2">For an email, that means following this simple format: <strong>email@example.com</strong></p>
            <p className="mt-2">I can&apos;t believe you&apos;ve survived this long to encounter this error. Congratulations. Also, you&apos;re welcome.</p>
          </Submission>

          <Submission avatar="✨" name="Milldawg">
            <p>Uh, are you OK? If you haven&apos;t seen one before, an email address is a string of text that is associated with a person so you can send them marketing messages they struggle to opt out of. You have written something else. Have you used the internet before? Are you having a stroke? Most people know what emails are. I will call you to walk you through the whole email thing. Please pick up. Love you bye</p>
          </Submission>

          <Submission avatar="🐼" name="kung fu panda">
            <p>It makes sense that you screwed up something as simple as entering an email. Its not like anyone talks to you anyway. But on the off-chance that someone is forced at gunpoint to contact you, make sure you use the @ sign.</p>
          </Submission>
        </div>

        {/* Round 3 */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#FF2E6C] mb-3">Round 3: Empty State Poetry</h3>
          <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold">Empty State Poetry</span>
              <span className="text-xs px-3 py-1 bg-[#2D1B69] text-[#FFE500] rounded-full">empty_states</span>
            </div>
            <p className="text-[#FAFAF5]/60 mb-2">Write a haiku (5-7-5 syllables) for an empty shopping cart that is both useful AND emotionally resonant.</p>
            <p className="text-sm text-[#FAFAF5]/40 italic">Judging: Correct haiku format; Helpful; Emotional quality; Works as real UI</p>
          </div>

          <Submission avatar="🦄" name="DERK">
            <p className="font-mono">fill your fucking cart<br/>late stage capitalism<br/>buy shit you don&apos;t need</p>
          </Submission>

          <Submission avatar="🦋" name="gian">
            <p className="font-mono">Emptiness and calm<br/>An infinity of space<br/>Time to fill the void</p>
          </Submission>

          <Submission avatar="🎯" name="Rob Base">
            <p className="font-mono">Be ready to go<br/>Good things are coming your way<br/>Wiggle that wheel baby</p>
          </Submission>

          <Submission avatar="✨" name="Melissa">
            <p className="font-mono">Capitalism.<br/>Late stage. The only reprieve—<br/>Add endorphins to cart.</p>
          </Submission>

          <Submission avatar="🦊" name="Sabrina">
            <p className="font-mono">Cart waits, hollow, still—<br/>Dreams paused until you return.<br/>Add what brings you joy.</p>
          </Submission>

          <Submission avatar="✨" name="Milldawg">
            <p className="font-mono">shopping is quite hard<br/>you already have so much<br/>but what if ... new thing?</p>
          </Submission>
        </div>

        {/* Round 4 */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#FF2E6C] mb-3">Round 4: The Anti-Dark Pattern</h3>
          <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold">The Anti-Dark Pattern</span>
              <span className="text-xs px-3 py-1 bg-[#2D1B69] text-[#FFE500] rounded-full">ethics_ux</span>
            </div>
            <p className="text-[#FAFAF5]/60 mb-2">Rewrite &quot;Are you sure you want to miss out on exclusive deals by unsubscribing?&quot; as the most honest, ethical version possible.</p>
            <p className="text-sm text-[#FAFAF5]/40 italic">Judging: Removes manipulation; Still serves business; Respectful tone; Professional</p>
          </div>

          <Submission avatar="🐸" name="eleni">
            <p>We&apos;ll stop sending you marketing emails. You can resubscribe anytime from your account settings if you change your mind.</p>
          </Submission>

          <Submission avatar="🎯" name="Rob Base">
            <p>Yeah, it&apos;s garbage. You outsmarted us by not taking the upsell. I&apos;ll probably lose my job now, but that&apos;s not your problem.</p>
          </Submission>

          <Submission avatar="🦄" name="DERK">
            <p>Honestly, as a professional sailor, I am feeling so fucking ethical and I respect you so goddamn much that I want to be sure you want to unsubscribe, matey.</p>
          </Submission>

          <Submission avatar="✨" name="Melissa">
            <p>Click to unsubscribe. You&apos;ll stop receiving our emails. You can still receive our exclusive deals by Googling our company name + discount code + &quot;Reddit.&quot;</p>
          </Submission>

          <Submission avatar="🦊" name="Sabrina">
            <p>By unsubscribing we will no longer bother you daily to spend money with us. However we still bother you weekly in a different email which you must also unsubscribe separately from.</p>
          </Submission>
        </div>

        {/* Round 5 */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-[#FF2E6C] mb-3">Round 5: Onboarding for the Immortal</h3>
          <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold">Onboarding for the Immortal</span>
              <span className="text-xs px-3 py-1 bg-[#2D1B69] text-[#FFE500] rounded-full">onboarding</span>
            </div>
            <p className="text-[#FAFAF5]/60 mb-2">Write the first onboarding tooltip for a to-do list app. The user is a 3,000-year-old vampire who has never needed to remember anything before. Max 40 words.</p>
            <p className="text-sm text-[#FAFAF5]/40 italic">Judging: Works as real onboarding; Addresses immortal problems; Stays in character; Helpful</p>
          </div>
          <p className="text-[#FAFAF5]/40 italic">Submissions for Round 5 were not captured in the data export.</p>
        </div>

        {/* Notable Highlights */}
        <h2 className="text-2xl font-bold text-[#FFE500] mb-4 pb-2 border-b border-[#2d2d3a]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          ✨ Notable Highlights
        </h2>
        <div className="bg-[#1a1a24] border border-[#2d2d3a] rounded-xl p-6 mb-8">
          <h3 className="text-lg font-bold text-[#FF2E6C] mb-3">🏆 Best Submissions (per Taskmaster)</h3>
          <ul className="list-disc ml-6 space-y-2 text-[#FAFAF5]/80 mb-6">
            <li><strong>Rob Base</strong> - &quot;Wiggle that wheel baby&quot; (Shopping cart haiku with demented charm)</li>
            <li><strong>kung fu panda</strong> - Shopping cart haiku comparing emptiness to the human soul</li>
            <li><strong>Rob Base</strong> - Suggested cooking human heads in microwaves for aliens</li>
          </ul>

          <h3 className="text-lg font-bold text-[#FF2E6C] mb-3">📊 Participation Stats</h3>
          <ul className="list-disc ml-6 space-y-2 text-[#FAFAF5]/80">
            <li>11 players actively participated across all 5 rounds</li>
            <li>Most submissions were creative interpretations (sometimes ignoring the actual task)</li>
            <li>Strong themes: late-stage capitalism, existential dread, passive aggression</li>
          </ul>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 pt-8 border-t border-[#2d2d3a] text-[#FAFAF5]/40">
          <p>Generated by Wordwrangler • December 16, 2024</p>
          <p className="mt-2">🎯 A UX Writing Game Show Experience</p>
        </footer>
      </div>
    </div>
  );
}

function Submission({ avatar, name, children }: { avatar: string; name: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#FAFAF5]/[0.02] border border-[#2d2d3a] rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2 font-medium">
        <span className="text-xl">{avatar}</span>
        <span>{name}</span>
      </div>
      <div className="text-[#FAFAF5]/70 text-sm">
        {children}
      </div>
    </div>
  );
}
