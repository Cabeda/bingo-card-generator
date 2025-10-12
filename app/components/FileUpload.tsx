import React, { useState, useRef, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { motion } from "motion/react";
import { Game } from "../utils/bingo.interface";
import { parseBingoCards, generateRandomBingoCards } from "../utils/utils";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [bingoCards, setBingoCards] = useState<Game | null>(null);
  const [numCards, setNumCards] = useState<number>(10);
  const [bingoPercard, setBingoPercard] = useState<number>(2); // New state for bingoPercard
  const [eventHeader, setEventHeader] = useState<string>(
    `Magusto ${new Date().getFullYear()}`
  );
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paróquia Nossa Senhora da Areosa"
  );
  const [progress, setProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile && selectedFile.name.endsWith(".bingoCards")) {
      setFile(selectedFile);
      const reader = new FileReader();
      const filename = selectedFile.name.replace(".bingoCards", "");
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const bingoGame = parseBingoCards(filename, content);
        setBingoCards(bingoGame);
      };
      reader.readAsText(selectedFile);
    } else {
      alert("Please upload a file with the .bingoCards extension.");
    }
  };

  const handleGenerateRandomCards = () => {
    setIsGenerating(true);
    // Reset visible cards when generating new cards
    setVisibleCards(new Set());
    
    // Use requestAnimationFrame to prevent blocking
    requestAnimationFrame(() => {
      const generatedCards = generateRandomBingoCards(numCards);
      setBingoCards({
        filename: `${getCurrentDate()}-${eventHeader}`,
        cards: generatedCards,
      });
      
      // Show first batch immediately (first 10 cards or all if less)
      const initialBatch = new Set(
        Array.from({ length: Math.min(10, numCards) }, (_, i) => i)
      );
      setVisibleCards(initialBatch);
      setIsGenerating(false);
    });
  };

  // Intersection Observer setup
  useEffect(() => {
    if (!bingoCards) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-index") || "0",
              10
            );
            setVisibleCards((prev) => new Set(prev).add(index));
          }
        });
      },
      {
        root: null,
        rootMargin: "200px", // Load cards 200px before they enter viewport
        threshold: 0,
      }
    );

    // Observe all card placeholders
    const elements = document.querySelectorAll(".card-placeholder");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [bingoCards]);

  // Callback to set card ref and observe
  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  const generatePDF = async () => {
    if (!bingoCards) return;
    
    setIsGeneratingPDF(true);
    setProgress(0);
    
    try {
      const pdf = new jsPDF("p", "pt", "a4");
      const cardsPerPage = bingoPercard; // Use bingoPercard for cards per page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const totalCards = bingoCards.cards.length;

      // Batch size for parallel processing
      const batchSize = 5;
      const imgOptions = {
        quality: 1,
        skipFonts: true,
        cacheBust: false, // Disable cache busting for speed
      };

      // Pre-convert all card images in batches for parallel processing
      const allImageUrls: string[] = [];
      for (let batch = 0; batch < totalCards; batch += batchSize) {
        const batchPromises = [];
        for (let i = batch; i < Math.min(batch + batchSize, totalCards); i++) {
          const cardRef = cardRefs.current[i];
          if (cardRef) {
            batchPromises.push(htmlToImage.toPng(cardRef, imgOptions));
          } else {
            batchPromises.push(Promise.resolve("")); // Empty placeholder
          }
        }
        const batchResults = await Promise.all(batchPromises);
        allImageUrls.push(...batchResults);
        setProgress((batch / totalCards) * 80); // 0-80% for image conversion
      }

      // Add images to PDF pages (fast operation)
      for (let i = 0; i < totalCards; i += cardsPerPage) {
        if (i > 0) {
          pdf.addPage();
        }
        pdf.text(eventHeader, pageWidth / 2, 30, { align: "center" });
        pdf.text(locationFooter, pageWidth / 2, pageHeight - 30, {
          align: "center",
        });

        for (let j = 0; j < cardsPerPage; j++) {
          const cardIndex = i + j;
          if (cardIndex >= totalCards) break;
          const imgDataUrl = allImageUrls[cardIndex];
          if (imgDataUrl) {
            // Calculate dimensions synchronously
            const img = new Image();
            img.src = imgDataUrl;
            const imgWidth = pageWidth - 40;
            const imgHeight = (cardRefs.current[cardIndex]?.offsetHeight || 400) * (imgWidth / (cardRefs.current[cardIndex]?.offsetWidth || 400));
            const positionY = j * (pageHeight / cardsPerPage) + 50;
            
            pdf.addImage(
              imgDataUrl,
              "PNG",
              20,
              positionY,
              imgWidth,
              imgHeight,
              undefined,
              "FAST" // Use fast compression
            );
          }
        }
        setProgress(80 + ((i + cardsPerPage) / totalCards) * 20); // 80-100% for PDF assembly
      }
      pdf.save(`${getCurrentDate()}-${eventHeader}.pdf`);
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setProgress(0);
        setIsGeneratingPDF(false);
      }, 1000);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Erro ao gerar PDF. Por favor, tente novamente.");
      setIsGeneratingPDF(false);
      setProgress(0);
    }
  };

  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}-${hours}${minutes}`;
  };

  const exportBingoGame = () => {
    if (!bingoCards) return;

    const content = bingoCards.cards
      .map((card) => {
        const cardNo = `CardNo.${card.cardTitle.split("-").pop()}`;
        const numberStrs = card.numbers.join(";");
        return `|${cardNo};${numberStrs}`;
      })
      .join("");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const filename = `${eventHeader}-${getCurrentDate()}.bingoCards`;

    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="container">
      <div className="file-upload">
        <h1>Gerador de cartões de Bingo</h1>
        <div className="margin-bottom-20">
          <label className="label-style">Número de cartões</label>
          <input
            type="number"
            value={numCards}
            onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
            placeholder="Número de cartões"
            min={1}
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Cartões por página</label>
          <input
            type="range"
            value={bingoPercard}
            onChange={(e) => setBingoPercard(parseInt(e.target.value, 10))}
            min={1}
            max={3}
            step={1}
            className="input-style"
          />
          <span>{bingoPercard}</span>
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Nome do evento</label>
          <input
            type="text"
            value={eventHeader}
            onChange={(e) => setEventHeader(e.target.value)}
            placeholder="Event Header"
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20">
          <label className="label-style">Local</label>
          <input
            type="text"
            value={locationFooter}
            onChange={(e) => setLocationFooter(e.target.value)}
            placeholder="Location Footer"
            className="input-style"
          />
        </div>
        <div className="margin-bottom-20 hidden">
          <label className="label-style">Upload .bingoCards File:</label>
          <input
            type="file"
            accept=".bingoCards"
            onChange={handleFileChange}
            className="input-style"
          />
          {file && <p>Selected file: {file.name}</p>}
        </div>
        <div className="margin-bottom-20">
          <button onClick={handleGenerateRandomCards} className="button-style">
            Gerar cartões de Bingo
          </button>
        </div>
        {isGenerating && (
          <motion.div
            className="margin-bottom-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: "center" }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid var(--primary-color)",
                borderTopColor: "transparent",
                borderRadius: "50%",
                margin: "0 auto",
              }}
            />
            <p style={{ marginTop: "10px", color: "var(--primary-color)" }}>
              A gerar cartões...
            </p>
          </motion.div>
        )}
        {bingoCards && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h3
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              Cartões de bingo
            </motion.h3>
            <motion.button
              onClick={exportBingoGame}
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Gerar .bingoCards
            </motion.button>
            <motion.button
              onClick={generatePDF}
              className="button-style"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              disabled={isGeneratingPDF}
              style={{
                opacity: isGeneratingPDF ? 0.6 : 1,
                cursor: isGeneratingPDF ? "not-allowed" : "pointer",
              }}
            >
              Gerar PDF
            </motion.button>
            {isGeneratingPDF && (
              <motion.div
                className="margin-bottom-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: "center", marginTop: "20px" }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid var(--primary-color)",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    margin: "0 auto",
                  }}
                />
                <p style={{ marginTop: "10px", color: "var(--primary-color)" }}>
                  A gerar PDF... {Math.round(progress)}%
                </p>
              </motion.div>
            )}
            {progress > 0 && progress < 100 && !isGeneratingPDF && (
              <div className="margin-bottom-20">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p>{Math.round(progress)}%</p>
              </div>
            )}
            {bingoCards.cards.map((card, index) => {
              const isVisible = visibleCards.has(index);
              
              return (
                <div
                  key={card.cardTitle}
                  className="card-placeholder"
                  data-index={index}
                  style={{
                    minHeight: isVisible ? "auto" : "400px", // Reserve space
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isVisible ? (
                    <motion.div
                      className="bingo-card"
                      ref={setCardRef(index)}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      <div className="grid-container">
                        {card.numbers.map((num, idx) => (
                          <motion.div
                            key={idx}
                            className={`bingo-cell ${num === null ? "empty" : ""}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.2,
                              delay: idx * 0.01,
                              ease: "easeOut",
                            }}
                          >
                            {num !== null ? num : ""}
                          </motion.div>
                        ))}
                      </div>
                      <p className="cardNumber">
                        {getCurrentDate()}-{card.cardTitle}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "var(--primary-color)",
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          border: "3px solid var(--primary-color)",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          margin: "0 auto 10px",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      <p style={{ fontSize: "14px" }}>A carregar cartão {index + 1}...</p>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
