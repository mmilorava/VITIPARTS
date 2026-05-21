import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import CarCard from "../components/CarCard";
import {
  getApiErrorMessage,
  getBrandById,
  getCarsByBrandId,
} from "../services/api";

const DETAIL_BANNER_IMAGE = "/home-banner.png";

function BrandPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [brand, setBrand] = useState(null);
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const searchTerm = searchParams.get("search")?.trim() || "";
  const normalizedSearch = searchTerm.toLowerCase();

  useEffect(() => {
    let isMounted = true;

    const loadBrandPage = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [brandData, carsData] = await Promise.all([
          getBrandById(id),
          getCarsByBrandId(id),
        ]);

        if (isMounted) {
          setBrand(brandData);
          setCars(carsData);
        }
      } catch (requestError) {
        if (isMounted) {
          setBrand(null);
          setCars([]);
          setError(
            getApiErrorMessage(
              requestError,
              "ბრენდის და მისი მანქანების ჩატვირთვა ვერ მოხერხდა."
            )
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      loadBrandPage();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  const filteredCars = useMemo(() => {
    if (!normalizedSearch) {
      return cars;
    }

    return cars.filter((car) => {
      const searchableText = [car.brand, car.model, car.year, car.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [cars, normalizedSearch]);

  return (
    <section className="page-section">
      <div className="container">
        <Link to="/" className="back-link">
          უკან დაბრუნება
        </Link>

        {isLoading ? (
          <div className="status-panel">
            <h3>ბრენდის გვერდი იტვირთება...</h3>
            <p>სისტემა არჩეული ბრენდის ინფორმაციას და მის მანქანებს ითხოვს.</p>
          </div>
        ) : error ? (
          <div className="status-panel status-panel-error">
            <h3>ბრენდის გვერდი ვერ ჩაიტვირთა</h3>
            <p>{error}</p>
            <p className="status-note">
              დარწმუნდით, რომ backend სერვერი მუშაობს და ეს ბრენდი მონაცემთა
              ბაზაში არსებობს.
            </p>
          </div>
        ) : brand ? (
          <>
            <section className="car-detail-shell">
              <div className="car-banner">
                <div className="car-banner-image is-generic">
                  <img src={DETAIL_BANNER_IMAGE} alt="VITIPARTS banner" />
                </div>

                <div className="car-info">
                  <p className="eyebrow">ბრენდი</p>
                  <h1>{brand.name}</h1>
                  
                </div>
              </div>
            </section>

            <div className="section-heading">
              <div>
                <p className="eyebrow">მანქანები</p>
                
              </div>
              <p className="section-copy">
                {searchTerm
                  ? `ნაჩვენებია ${cars.length}-დან ${filteredCars.length} მანქანა მოთხოვნისთვის: "${searchTerm}".`
                  : ""}
              </p>
            </div>

            {cars.length > 0 ? (
              filteredCars.length > 0 ? (
                <div className="cars-grid">
                  {filteredCars.map((car) => (
                    <CarCard key={car._id || car.id} car={car} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>თქვენს ძებნას შესაბამისი მანქანები ვერ მოიძებნა</h3>
                  <p>სცადეთ სხვა მოდელი, წელი ან საკვანძო სიტყვა.</p>
                </div>
              )
            ) : (
              <div className="empty-state">
                <h3>ამ ბრენდზე მანქანები ჯერ არ არის დამატებული</h3>
                
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>ბრენდი ვერ მოიძებნა</h3>
            <p>მოთხოვნილი ბრენდი ვერ მოიძებნა.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default BrandPage;
