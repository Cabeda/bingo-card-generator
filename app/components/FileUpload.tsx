// File: FileUpload.tsx
import React, { useState, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface Card {
  cardNumber: string;
  numbers: (number | null)[];
}

interface BingoGame {
  filename?: string;
  cards: Card[];
}

export function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [bingoCards, setBingoCards] = useState<BingoGame | null>(null);
  const [numCards, setNumCards] = useState<number>(10);
  const [eventHeader, setEventHeader] = useState<string>("Magusto 2024");
  const [locationFooter, setLocationFooter] = useState<string>(
    "Paroquia Nossa Senhora da Areosa"
  );
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
        card = createRandomBingoCard(i + 1);
      } while (generatedCardNumbers.has(card.numbers.toString()));
      generatedCardNumbers.add(card.numbers.toString());
      generatedCards.push(card);
    }

    return generatedCards;
  };

  const createRandomBingoCard = (cardNumber: number): Card => {
    const columnRanges = [
      [1, 9],
      [10, 19],
      [20, 29],
      [30, 39],
      [40, 49],
      [50, 59],
      [60, 69],
      [70, 79],
      [80, 90],
    ];

    const columns = columnRanges.map(([min, max]) => {
      const numbers = [];
      for (let i = min; i <= max; i++) {
        numbers.push(i);
      }
      return numbers;
    });

    const cardNumbers: (number | null)[] = Array(27).fill(null);

    let numbersNeeded = 15;
    const columnCounts = Array(9).fill(1);
    numbersNeeded -= 9;

    let indices = Array.from(Array(9).keys());
    while (numbersNeeded > 0) {
      const idx = indices.splice(
        Math.floor(Math.random() * indices.length),
        1
      )[0];
      columnCounts[idx]++;
      numbersNeeded--;
      if (indices.length === 0) {
        indices = columnCounts
          .map((count, idx) => (count < 3 ? idx : -1))
          .filter((idx) => idx >= 0);
      }
    }

    for (let col = 0; col < 9; col++) {
      const count = columnCounts[col];
      const availableNumbers = columns[col];
      const selectedNumbers = [];
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        selectedNumbers.push(availableNumbers.splice(randomIndex, 1)[0]);
      }
      const rows = [0, 1, 2];
      for (const num of selectedNumbers) {
        const randomRowIndex = Math.floor(Math.random() * rows.length);
        const row = rows.splice(randomRowIndex, 1)[0];
        cardNumbers[row * 9 + col] = num;
      }
    }

    return {
      cardNumber: `Random-${cardNumber}`,
      numbers: cardNumbers,
    };
  };

  const generatePDF = async () => {
    if (!bingoCards) return;
    const pdf = new jsPDF("p", "pt", "a4");
    const cardsPerPage = 2;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < bingoCards.cards.length; i += cardsPerPage) {
      if (i > 0) {
        pdf.addPage();
      }
      pdf.setFontSize(18);
      pdf.text(eventHeader, pageWidth / 2, 30, { align: "center" });
      pdf.setFontSize(12);
      pdf.text(locationFooter, pageWidth / 2, pageHeight - 30, {
        align: "center",
      });
      for (let j = 0; j < cardsPerPage; j++) {
        const cardIndex = i + j;
        if (cardIndex >= bingoCards.cards.length) break;
        const cardRef = cardRefs.current[cardIndex];
        if (cardRef) {
          const canvas = await html2canvas(cardRef);
          const imgData = canvas.toDataURL("image/png");
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const positionY = j * (pageHeight / cardsPerPage) + 50;
          pdf.addImage(imgData, "PNG", 20, positionY, imgWidth, imgHeight);
        }
      }
    }
    pdf.save("bingo_cards.pdf");
  };
  const getCurrentDate = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Number of Bingo Cards:
        </label>
        <input
          type="number"
          value={numCards}
          onChange={(e) => setNumCards(parseInt(e.target.value, 10))}
          placeholder="Number of Bingo Cards"
          min={1}
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleGenerateRandomCards}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Generate Random Bingo Cards
        </button>
      </div>
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Event Header:
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
        <label style={{ display: "block", marginBottom: "5px" }}>
          Location Footer:
        </label>
        <input
          type="text"
          value={locationFooter}
          onChange={(e) => setLocationFooter(e.target.value)}
          placeholder="Location Footer"
          style={{ padding: "5px", width: "100%", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginBottom: "20px" }}>
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
      {bingoCards && (
        <div>
          <h3>Bingo Cards:</h3>
          <button
            onClick={generatePDF}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Generate PDF
          </button>
          <button
            onClick={exportBingoGame}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Download .bingoCards File
          </button>
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
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h4 style={{ marginBottom: "10px", color: "black" }}>
                Card No. {card.cardNumber}
              </h4>
              <div
                className="grid-container"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(9, 60px)",
                  gridTemplateRows: "repeat(3, 60px)",
                  gap: "2px",
                }}
              >
                {card.numbers.map((num, idx) => (
                  <div
                    key={idx}
                    className="cell"
                    style={{
                      backgroundColor: num !== null ? "yellow" : "white",
                      border: "1px solid black",
                      width: "60px",
                      height: "60px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "black",
                    }}
                  >
                    {num !== null ? num : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
