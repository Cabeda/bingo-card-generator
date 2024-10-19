// File: FileUpload.tsx
import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import * as htmlToImage from "html-to-image";
import { Card, BingoGame } from "../utils/bingo.interface";
import { generateBingoCard } from "../utils/utils";

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [bingoCards, setBingoCards] = useState<BingoGame | null>(null);
  const [numCards, setNumCards] = useState<number>(10);
  const [eventHeader, setEventHeader] = useState<string>("Magusto 2024");
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paroquia Nossa Senhora da Areosa"
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

  const parseBingoCards = (filename: string, content: string): BingoGame => {
    const cards: Card[] = content
      .split("|")
      .filter(Boolean)
      .map((cardStr) => {
        const [cardNoStr, ...numberStrs] = cardStr.split(";");
        const cardNumber = `${filename}-${cardNoStr.replace("CardNo.", "")}`;
        const numbers = numberStrs.map((num) =>
          num ? parseInt(num, 10) : null
        );
        return { cardNumber, numbers };
      });
    return { filename, cards };
  };

  const handleGenerateRandomCards = () => {
    const generatedCards = generateRandomBingoCards(numCards);
    setBingoCards({ cards: generatedCards });
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
    const cardsPerPage = 2;
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
          const imgDataUrl = await htmlToImage.toPng(cardRef);
          const img = new Image();
          img.src = imgDataUrl;
          await new Promise((resolve) => {
            img.onload = () => {
              const imgWidth = pageWidth - 40;
              const imgHeight = (img.height * imgWidth) / img.width;
              const positionY = j * (pageHeight / cardsPerPage) + 50;
              pdf.addImage(imgDataUrl, "PNG", 20, positionY, imgWidth, imgHeight);
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
        const cardNo = `CardNo.${card.cardNumber.split("-").pop()}`;
        const numberStrs = card.numbers
          .map((num) => (num !== null ? num : ""))
          .join(";");
        return `${cardNo};${numberStrs}`;
      })
      .join("|");

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
    <div
      className="file-upload"
      style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}
    >
      <h1>Gerador de cartões de Bingo</h1>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Número de cartões
        </label>
        <input
          type="number"
          value={numCards}
          onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
          placeholder="Número de cartões"
          min={1}
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Nome do evento
        </label>
        <input
          type="text"
          value={eventHeader}
          onChange={(e) => setEventHeader(e.target.value)}
          placeholder="Event Header"
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Local</label>
        <input
          type="text"
          value={locationFooter}
          onChange={(e) => setLocationFooter(e.target.value)}
          placeholder="Location Footer"
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "20px", visibility: "hidden" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Upload .bingoCards File:
        </label>
        <input
          type="file"
          accept=".bingoCards"
          onChange={handleFileChange}
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
        {file && <p>Selected file: {file.name}</p>}
      </div>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleGenerateRandomCards}
          style={{
            padding: "0.6rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#007BFF", // Primary blue color
            color: "#FFFFFF", // White text color
            border: "none", // Remove default border
            borderRadius: "5px", // Rounded corners
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", // Subtle shadow
            transition: "background-color 0.3s ease", // Smooth transition for hover effect
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#0056b3")
          } // Darker blue on hover
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#007BFF")
          } // Original color on mouse leave
        >
          Gerar cartões de Bingo
        </button>
      </div>
      {bingoCards && (
        <div>
          <h3>Cartões de bingo</h3>
          <button
            onClick={exportBingoGame}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Gerar .bingoCards
          </button>
          <button
            onClick={generatePDF}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Gerar PDF
          </button>
          {progress > 0 && progress < 100 && (
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#f3f3f3",
                  borderRadius: "5px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    backgroundColor: "#007BFF",
                    height: "10px",
                    transition: "width 0.3s ease",
                  }}
                ></div>
              </div>
              <p>{Math.round(progress)}%</p>
            </div>
          )}
          {bingoCards.cards.map((card, index) => (
            <div
              key={card.cardNumber}
              className="bingo-card"
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              style={{
                pageBreakInside: "avoid",
                marginBottom: "20px",
                padding: "10px",
                borderRadius: "5px",
              }}
            >
              <div
                className="grid-container"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(9, 60px)",
                  gridTemplateRows: "repeat(3, 60px)",
                }}
              >
                {card.numbers.map((num, idx) => (
                  <div
                    key={idx}
                    className={`bingo-cell ${num === null ? "empty" : ""}`}
                  >
                    {num !== null ? num : ""}
                  </div>
                ))}
              </div>
              <p style={{color: "black" }}>
                {getCurrentDate()}-{card.cardNumber}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
