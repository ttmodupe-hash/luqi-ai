// @vitest-environment jsdom
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import LocalPulsePage from "../src/pages/LocalPulsePage";

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it("renders mobile-friendly original publisher destinations, without any network or AI calls",()=>{
 const fetchMock=vi.fn(); vi.stubGlobal("fetch",fetchMock);
 render(<MemoryRouter><LocalPulsePage/></MemoryRouter>);
 expect(screen.getByRole("heading",{name:/Hear the news/})).toBeTruthy();
 expect(screen.getByRole("link",{name:/Open 702 on Primedia/}).getAttribute("href")).toBe("https://www.primediaplus.com/station/702/");
 expect(screen.getByRole("link",{name:/Browse EWN's latest reporting/}).getAttribute("target")).toBe("_blank");
 expect(screen.getByText(/not a live headline feed or emergency warning service/)).toBeTruthy();
 expect(screen.queryByRole("audio")).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
});
it("filters regions honestly and prepares a question in the chosen language without sending it",()=>{
 const fetchMock=vi.fn(); vi.stubGlobal("fetch",fetchMock);
 render(<MemoryRouter><LocalPulsePage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText("Local Pulse region"),{target:{value:"other"}});
 expect(screen.queryByRole("link",{name:/Open 702 on Primedia/})).toBeNull();
 expect(screen.getByText(/Province-specific talk stations have not yet been individually reviewed/)).toBeTruthy();
 fireEvent.change(screen.getByLabelText("Local Pulse region"),{target:{value:"GP"}});
 expect(screen.getByRole("link",{name:/Open 702 on Primedia/})).toBeTruthy();
 expect(screen.queryByRole("link",{name:/Open CapeTalk on Primedia/})).toBeNull();
 fireEvent.change(screen.getByLabelText("Local Pulse preferred language"),{target:{value:"Setswana"}});
 expect((screen.getByLabelText("Prepared Local Pulse question") as HTMLTextAreaElement).value).toContain("Setswana");
 expect(screen.getByRole("link",{name:/Open Luqi Chat/}).getAttribute("href")).toBe("/chat");
 expect(fetchMock).not.toHaveBeenCalled();
});
