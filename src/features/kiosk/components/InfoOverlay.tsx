import otterImage from "@/assets/otter_default_rough_draft.png";
import corkboardImage from "@/assets/corkboard.png";
import polaroidFrame1 from "@/assets/polaroid_frame1.svg";
import pinkBackArrow from "@/assets/pink_back_arrow.svg";

const CARD = "absolute z-[2] overflow-visible rounded-[4px] bg-[#ede8d0]";
const CARD_FRAME = "pointer-events-none absolute -inset-[2%] z-0 h-[104%] w-[104%]";
const CARD_TAPE =
  "absolute -top-[10px] left-1/2 z-[2] h-[22px] w-[90px] bg-[#e405ac] [transform:translateX(-50%)_rotate(-3deg)]";
const CARD_TEXT = "absolute z-[1] font-averia text-black";
const CARD_HEADING = "m-0 text-[33px] tracking-[5.61px]";

interface InfoOverlayProps {
  onClose: () => void;
}

/** Full-screen "about" overlay shown over the idle screen (Figma node 997-1286). */
export function InfoOverlay({ onClose }: InfoOverlayProps) {
  return (
    <>
      {/* Dark background: unscaled, covers full screen */}
      <div className="absolute inset-0 z-20 bg-[rgba(80,100,110,0.78)]" />

      {/* Cork board: unscaled, full size */}
      <img
        src={corkboardImage}
        alt=""
        className="absolute top-[5%] left-[10%] z-[21] h-[60%] w-[55%] origin-center object-contain [transform:rotate(179.9deg)]"
      />

      <div className="absolute inset-0 z-[22] h-[1080px] w-[1920px] origin-top-left overflow-hidden [transform:scale(0.7)]">
        <p className="absolute top-[130px] left-[420px] z-[3] m-0 font-jersey text-[78px] tracking-[13.26px] text-white">
          about
        </p>

        {/* Card 1: me2you is... */}
        <div className={`${CARD} top-[228px] left-[424px] h-[274px] w-[599px] [transform:rotate(-3.26deg)]`}>
          <img src={polaroidFrame1} alt="" className={CARD_FRAME} />
          <div className={CARD_TAPE} />
          <div className={`${CARD_TEXT} inset-[4%_9%_0_7%] text-[33px] leading-[1.4] tracking-[5.61px]`}>
            <p>
              <strong className="font-bold">me2you</strong> is...
              <br />a digital installation meant for light-hearted community interaction!
            </p>
          </div>
        </div>

        {/* Card 2: you can... */}
        <div className={`${CARD} top-[205px] left-[1094px] h-[590px] w-[440px] [transform:rotate(8.71deg)]`}>
          <img src={polaroidFrame1} alt="" className={CARD_FRAME} />
          <div className={CARD_TAPE} />
          <div className={`${CARD_TEXT} inset-[3%_8%_5%_19%] text-[25px] leading-[1.5] tracking-[4.25px]`}>
            <p className={`${CARD_HEADING} mb-2`}>
              <strong className="font-bold">you can...</strong>
            </p>
            <ul className="m-0 pl-7">
              <li className="mb-4">see who is in your community</li>
              <li className="mb-4">play games powered by computer vision</li>
              <li className="mb-4">create your own account and interact with others!</li>
            </ul>
          </div>
        </div>

        {/* Card 3: privacy */}
        <div className={`${CARD} top-[532px] left-[482px] h-[376px] w-[541px] [transform:rotate(2.94deg)]`}>
          <img src={polaroidFrame1} alt="" className={CARD_FRAME} />
          <div className={CARD_TAPE} />
          <div className={`${CARD_TEXT} inset-[3%_13%_10%_8%] text-[25px] leading-[1.5] tracking-[4.25px]`}>
            <p className={`${CARD_HEADING} mb-3`}>
              <strong className="font-bold">concerned about privacy?</strong>
            </p>
            <ul className="m-0 pl-7">
              <li className="mb-3">
                me2you does not save any of your information, even if you interact with our features!
              </li>
              <li className="mb-3">we only save your info if you make an account!</li>
            </ul>
          </div>
        </div>

        <img
          src={otterImage}
          alt=""
          className="pointer-events-none absolute top-[750px] left-[1150px] z-[3] h-[294px] w-[421px] object-contain"
        />
        <p className="absolute top-[720px] left-[1300px] z-[3] m-0 font-averia text-[25px] tracking-[4.25px] text-black">
          have fun!
        </p>

        {/* Close / next arrow button */}
        <button
          className="absolute top-[850px] left-[1530px] z-[4] flex cursor-pointer items-center justify-center border-0 bg-transparent p-0"
          onClick={onClose}
        >
          <img src={pinkBackArrow} alt="next" className="w-[100px] [transform:rotate(180deg)]" />
        </button>
      </div>
    </>
  );
}
