import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { Card, Game } from "../utils/bingo.interface";
import { generateBingoCard, parseBingoCards } from "../utils/utils";

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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

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
    const generatedCards = generateRandomBingoCards(numCards);
    setBingoCards({
      filename: `${getCurrentDate()}-${eventHeader}`,
      cards: generatedCards,
    });
  };

  const generateRandomBingoCards = (numberOfCards: number): Card[] => {
    const generatedCards: Card[] = [];
    const generatedCardNumbers = new Set<string>();

    for (let i = 0; i < numberOfCards; i++) {
      let card: Card;
      do {
        card = generateBingoCard(`${i + 1}`);
      } while (generatedCardNumbers.has(card.numbers.toString()));
      generatedCardNumbers.add(card.numbers.toString());
      generatedCards.push(card);
    }

    return generatedCards;
  };

  const generatePDF = async () => {
    if (!bingoCards) return;
    const pdf = new jsPDF("p", "pt", "a4");
    const cardsPerPage = bingoPercard; // Use bingoPercard for cards per page
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const totalCards = bingoCards.cards.length;
    setProgress(0);

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
        const cardRef = cardRefs.current[cardIndex];
        if (cardRef) {
          const imgDataUrl = await htmlToImage.toPng(cardRef, { 
            quality: 0.3,
            skipFonts: true, // Skip font processing to avoid font errors
            cacheBust: true, // Ensure fresh capture
          });
          const img = new Image();
          img.src = imgDataUrl;
          await new Promise((resolve) => {
            img.onload = () => {
              const imgWidth = pageWidth - 40;
              const imgHeight = (img.height * imgWidth) / img.width;
              const positionY = j * (pageHeight / cardsPerPage) + 50;
              pdf.addImage(
                imgDataUrl,
                "PNG",
                20,
                positionY,
                imgWidth,
                imgHeight
              );
              resolve(null);
            };
          });
        }
      }
      setProgress(((i + cardsPerPage) / totalCards) * 100);
    }
    pdf.save(`${getCurrentDate()}-${eventHeader}.pdf`);
    setProgress(100);
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
            max={5000}
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
        {bingoCards && (
          <div>
            <h3>Cartões de bingo</h3>
            <button onClick={exportBingoGame} className="button-style">
              Gerar .bingoCards
            </button>
            <button onClick={generatePDF} className="button-style">
              Gerar PDF
            </button>
            {progress > 0 && progress < 100 && (
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
            {bingoCards.cards.map((card, index) => (
              <div
                key={card.cardTitle}
                className="bingo-card"
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
              >
                <div className="grid-container">
                  {card.numbers.map((num, idx) => (
                    <div
                      key={idx}
                      className={`bingo-cell ${num === null ? "empty" : ""}`}
                    >
                      {num !== null ? num : ""}
                    </div>
                  ))}
                </div>
                <p className="cardNumber">
                  {getCurrentDate()}-{card.cardTitle}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
